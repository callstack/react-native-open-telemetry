import {execFileSync, spawn} from 'node:child_process';
import path from 'node:path';
import {test as base} from '@e2e-dev/mobile';
import {expect, type App, type Screen} from 'e2e';

// Device runs compare to the reviewed .js expected files until Tasks 24/25; they must never rewrite them.
if (process.env.VERIFY_UPDATE === '1')
  throw new Error('verify/e2e is compare-only: unset VERIFY_UPDATE (`bun verify --update --e2e` already does)');

const verifyDir = path.join(import.meta.dirname, '..');
process.env.VERIFY_DIR = verifyDir;
// ponytail: e2e loads files as ESM; the CJS-style harness modules (all in verify/harness/) read __dirname.
// Give them that one value; drop when the harness moves to import.meta.dirname.
(globalThis as any).__dirname ??= path.join(verifyDir, 'harness');

const {startCollector} = await import('../harness/collector');
const {compareToExpected} = await import('../harness/compare');
const {allScenarios} = await import('../scenarios');
type Collector = Awaited<ReturnType<typeof startCollector>>;

/** Must match COLLECTOR_PORT in example/src/ScenariosScreen.tsx. */
export const COLLECTOR_PORT = 4318;

/** `android-bare` -> `android`. */
export const platformOf = (targetName: string) => targetName.split('-')[0] as 'android' | 'ios';

export const test = base.extend<{target: string}, {collector: Collector; installed: void}>({
  collector: [
    async ({}, use) => {
      const c = await startCollector({port: COLLECTOR_PORT, artifactsDir: path.join(verifyDir, 'artifacts')});
      await use(c);
      await c.close();
    },
    {scope: 'worker'},
  ],
  installed: [
    async ({device}, use) => {
      const {app} = await device.installApp();
      // Warm-up launch: on Android the first relaunch right after an install can fail with
      // "remained foreground after close", and a test retry does not re-run this worker fixture.
      await device.openApp(app);
      await device.closeApp();
      await use();
    },
    {scope: 'worker', auto: true},
  ],
  // ponytail: the target name is read off the agent-device session name (`e2e-<target>-<slot>`); swap for a runner API when e2e exposes one
  target: async ({device}, use) => {
    await use(device.unstable_raw.session.replace(/^e2e-/, '').replace(/-\d+$/, ''));
  },
});

/** Taps `scenario-<name>`, waits for `scenario-done`, compares what the collector got. */
export async function expectScenario(
  name: string,
  target: string,
  {app, screen, collector}: {app: App; screen: Screen; collector: Collector},
) {
  const s = allScenarios().find(x => x.name === name);
  if (!s) throw new Error(`unknown scenario ${name}`);
  test.skip(!s.targets.includes(platformOf(target)), `${name} does not run on ${platformOf(target)}`);
  await app.open();
  collector.begin(name, platformOf(target));
  let actual;
  try {
    await screen.getByTestId(`scenario-${name}`).tap();
    await expect(screen.getByTestId('scenario-done')).toBeVisible({timeout: 30_000});
  } finally {
    actual = await collector.end();
  }
  // Until Tasks 24/25 device runs compare to the JS expected files.
  const r = compareToExpected(name, 'js', actual);
  if (!r.ok) throw new Error('\n' + r.report);
}

// iOS: `log show` takes ~60 s per call on a CI runner, so lines are captured live by a `log stream` started in clearDeviceLog.
const iosStreams = new Map<string, {lines: string[]}>();

/** Device log lines containing `needle`, logged after the last clearDeviceLog (Android: logcat since the clear; iOS: the live stream). */
export function deviceLog(platform: 'android' | 'ios', deviceId: string, needle: string, _since: Date): string[] {
  const out =
    platform === 'android'
      ? execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-v', 'raw', '-s', 'RNOtel:I'], {encoding: 'utf8'})
      : (iosStreams.get(deviceId)?.lines ?? []).join('\n');
  return out.split('\n').filter(l => l.includes(needle));
}

/** Starts a fresh log window; returns its start for deviceLog. */
export async function clearDeviceLog(platform: 'android' | 'ios', deviceId: string): Promise<Date> {
  if (platform === 'android') execFileSync('adb', ['-s', deviceId, 'logcat', '-c']);
  else {
    const state = {lines: [] as string[]};
    iosStreams.set(deviceId, state);
    const child = spawn(
      'xcrun',
      ['simctl', 'spawn', deviceId, 'log', 'stream', '--style', 'compact', '--level', 'info',
        '--predicate', 'process == "OpenTelemetryExample" AND eventMessage CONTAINS "RNOtel"'],
      {stdio: ['ignore', 'pipe', 'ignore']},
    );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d: string) => state.lines.push(...d.split('\n')));
    child.unref();
    (child.stdout as any).unref?.();
    process.on('exit', () => child.kill());
    await new Promise(r => setTimeout(r, 3_000)); // let the stream attach before the tap
  }
  return new Date();
}
