import {execFileSync, spawn} from 'node:child_process';
import path from 'node:path';
import {test as mobileBase} from '@e2e-dev/mobile';
import {test as webBase} from '@e2e-dev/web';
import {describe, expect, type App, type Screen} from 'e2e';
import type {Target} from '../harness/scenario';

if (process.env.VERIFY_UPDATE === '1')
  throw new Error('verify/e2e is compare-only: unset VERIFY_UPDATE (`bun verify --update --e2e` already does)');

const verifyDir = path.join(import.meta.dirname, '..');
process.env.VERIFY_DIR = verifyDir;
(globalThis as any).__dirname ??= path.join(verifyDir, 'harness');

const {startCollector} = await import('../harness/collector');
const {compareToExpected} = await import('../harness/compare');
export const {allScenarios} = await import('../scenarios');
type Collector = Awaited<ReturnType<typeof startCollector>>;

export const ANDROID_EXPORT_URL_FILE = '/sdcard/Android/data/opentelemetry.example/files/otel-export-url';

export const COLLECTOR_PORT = 4318;

export const bundleIdOf = (targetName: string) => (targetName.endsWith('-expo') ? 'opentelemetry.example.expo' : 'opentelemetry.example');

export const platformOf = (targetName: string) => targetName.split('-')[0] as 'android' | 'ios' | 'web';

export const MOBILE = ['android', 'ios'];

const collector = [
  async ({}, use: (c: Collector) => Promise<void>) => {
    const c = await startCollector({port: COLLECTOR_PORT, artifactsDir: path.join(verifyDir, 'artifacts')});
    await use(c);
    await c.close();
  },
  {scope: 'worker'},
] as const;

export const webTest = webBase.extend<{target: string}, {collector: Collector}>({
  collector,
  target: async ({platform}, use) => {
    await use(platform);
  },
});

export const test = mobileBase.extend<{target: string}, {collector: Collector; installed: void}>({
  collector,
  installed: [
    async ({device}, use) => {
      const {app} = await device.installApp();
      if (device.unstable_raw.session.includes('android'))
        execFileSync('adb', ['-s', device.unstable_raw.deviceId, 'shell', `rm -f ${ANDROID_EXPORT_URL_FILE}`]);
      await device.openApp(app);
      await device.closeApp();
      await use();
    },
    {scope: 'worker', auto: true},
  ],
  target: async ({device}, use) => {
    await use(device.unstable_raw.session.replace(/^e2e-/, '').replace(/-\d+$/, ''));
  },
});

type Fixtures = {app: App; screen: Screen; collector: Collector; target: string};

export function anyTarget(title: string, body: (f: Fixtures) => Promise<void>) {
  test(title, {platforms: MOBILE}, async ({app, screen, collector, target}) => body({app, screen, collector, target}));
  describe('web', {platforms: ['web']}, () =>
    webTest(title, async ({app, screen, collector, target}) => body({app, screen, collector, target})),
  );
}

export type ScenarioSteps = {
  launch?: () => Promise<void>;
  afterBegin?: () => void;
  doneTimeout?: number;
  afterDone?: () => Promise<void>;
};

export async function expectScenario(
  name: string,
  target: string,
  {app, screen, collector}: {app: App; screen: Screen; collector: Collector},
  steps: ScenarioSteps = {},
) {
  const s = allScenarios().find(x => x.name === name);
  if (!s) throw new Error(`unknown scenario ${name}`);
  test.skip(!s.targets.includes(platformOf(target)) && !s.targets.includes(target as Target), `${name} does not run on ${target}`);
  await (steps.launch ? steps.launch() : app.restart());

  collector.begin(name, platformOf(target));
  steps.afterBegin?.();
  let actual;
  try {
    await screen.getByTestId(`scenario-${name}`).tap();
    await expect(screen.getByTestId('scenario-done')).toBeVisible({timeout: steps.doneTimeout ?? 30_000});
    await steps.afterDone?.();
  } finally {
    actual = await collector.end();
  }
  const r = compareToExpected(name, platformOf(target), actual, {draft: process.env.VERIFY_E2E_DRAFT === '1'});
  if (!r.ok) throw new Error('\n' + r.report);
}

export async function tapFlush(screen: Screen, n: number, timeout = 10_000) {
  await screen.getByTestId('flush').tap();
  await expect(screen.getByTestId(`flush-done-${n}`)).toBeVisible({timeout});
}

export async function until(ok: () => boolean, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (!ok() && Date.now() < end) await new Promise(r => setTimeout(r, 250));
  return ok();
}

const iosStreams = new Map<string, {lines: string[]}>();

export function deviceLog(platform: 'android' | 'ios', deviceId: string, needle: string): string[] {
  const out =
    platform === 'android'
      ? execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-v', 'raw', '-s', 'RNOtel:I', 'ReactNativeJS:I'], {encoding: 'utf8'})
      : (iosStreams.get(deviceId)?.lines ?? []).join('\n');
  return out.split('\n').filter(l => l.includes(needle));
}

export async function clearDeviceLog(platform: 'android' | 'ios', deviceId: string): Promise<void> {
  if (platform === 'android') execFileSync('adb', ['-s', deviceId, 'logcat', '-b', 'all', '-c']);
  else {
    const state = {lines: [] as string[]};
    iosStreams.set(deviceId, state);
    const child = spawn(
      'xcrun',
      ['simctl', 'spawn', deviceId, 'log', 'stream', '--timeout', '3m', '--style', 'compact', '--level', 'info',
        '--predicate', 'process == "OpenTelemetryExample" AND (eventMessage CONTAINS "RNOtel" OR eventMessage CONTAINS "[react-native-open-telemetry]")'],
      {stdio: ['ignore', 'pipe', 'ignore']},
    );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d: string) => state.lines.push(...d.split('\n')));
    child.unref();
    (child.stdout as any).unref?.();
    process.on('exit', () => child.kill());
    await new Promise(r => setTimeout(r, 3_000));
  }
}
