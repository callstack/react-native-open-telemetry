import {execFileSync, spawn} from 'node:child_process';
import path from 'node:path';
import {test as mobileBase} from '@e2e-dev/mobile';
import {test as webBase} from '@e2e-dev/web';
import {describe, expect, type App, type Screen} from 'e2e';
import type {Target} from '../harness/scenario';

// Device runs compare to the reviewed expected files of their platform (native-first); never rewrite them.
if (process.env.VERIFY_UPDATE === '1')
  throw new Error('verify/e2e is compare-only: unset VERIFY_UPDATE (`bun verify --update --e2e` already does)');

const verifyDir = path.join(import.meta.dirname, '..');
process.env.VERIFY_DIR = verifyDir;
// ponytail: e2e loads files as ESM; the CJS-style harness modules (all in verify/harness/) read __dirname.
// Give them that one value; drop when the harness moves to import.meta.dirname.
(globalThis as any).__dirname ??= path.join(verifyDir, 'harness');

const {startCollector} = await import('../harness/collector');
const {compareToExpected} = await import('../harness/compare');
export const {allScenarios} = await import('../scenarios');
type Collector = Awaited<ReturnType<typeof startCollector>>;

/** Test-mode override of the Android example's export URL (OtelInit.kt), written by native-init-failure.e2e.ts. */
export const ANDROID_EXPORT_URL_FILE = '/sdcard/Android/data/opentelemetry.example/files/otel-export-url';

/** Must match the example apps' native init URLs (OtelInit.kt, AppDelegate.swift). */
export const COLLECTOR_PORT = 4318;

/** Must match e2e.config.ts: the bare example, or the Expo app (`*-expo`). */
export const bundleIdOf = (targetName: string) => (targetName.endsWith('-expo') ? 'opentelemetry.example.expo' : 'opentelemetry.example');

/** `android-bare` -> `android`; `web` stays `web`. */
export const platformOf = (targetName: string) => targetName.split('-')[0] as 'android' | 'ios' | 'web';

/** Platforms of the targets `test` runs on; a test on web goes through `webTest` or `anyTarget`. */
export const MOBILE = ['android', 'ios'];

// One collector per worker. Each chain below declares it; a target runs only one chain's tests (`platforms`).
const collector = [
  async ({}, use: (c: Collector) => Promise<void>) => {
    const c = await startCollector({port: COLLECTOR_PORT, artifactsDir: path.join(verifyDir, 'artifacts')});
    await use(c);
    await c.close();
  },
  {scope: 'worker'},
] as const;

/** Web targets (`web`): a fresh browser context per test; `platform` is the target name. */
export const webTest = webBase.extend<{target: string}, {collector: Collector}>({
  collector,
  target: async ({platform}, use) => {
    await use(platform);
  },
});

/** Device targets: installs the app once per worker. Pass `{platforms: MOBILE}`: its fixtures name `device`. */
export const test = mobileBase.extend<{target: string}, {collector: Collector; installed: void}>({
  collector,
  installed: [
    async ({device}, use) => {
      const {app} = await device.installApp();
      // a killed native-init-failure run must not leave its bad export URL behind for later launches
      if (device.unstable_raw.session.includes('android'))
        execFileSync('adb', ['-s', device.unstable_raw.deviceId, 'shell', `rm -f ${ANDROID_EXPORT_URL_FILE}`]);
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

type Fixtures = {app: App; screen: Screen; collector: Collector; target: string};

/** Registers `body` on device targets (`test`, title as is) and on web (`webTest`, as `web › <title>`: titles are unique). */
export function anyTarget(title: string, body: (f: Fixtures) => Promise<void>) {
  test(title, {platforms: MOBILE}, async ({app, screen, collector, target}) => body({app, screen, collector, target}));
  describe('web', {platforms: ['web']}, () =>
    webTest(title, async ({app, screen, collector, target}) => body({app, screen, collector, target})),
  );
}

/** Steps the failure scenarios (Task 27) add around the tap-and-compare. */
export type ScenarioSteps = {
  /** Replaces the cold start, e.g. to relaunch with launch arguments. */
  launch?: () => Promise<void>;
  /** After `collector.begin` (which clears refusals, F15). */
  afterBegin?: () => void;
  /** How long `scenario-done` may take after the tap. */
  doneTimeout?: number;
  /** After `scenario-done`, before the collector's output is read. */
  afterDone?: () => Promise<void>;
};

/** Taps `scenario-<name>`, waits for `scenario-done`, compares what the collector got. */
export async function expectScenario(
  name: string,
  target: string,
  {app, screen, collector}: {app: App; screen: Screen; collector: Collector},
  steps: ScenarioSteps = {},
) {
  const s = allScenarios().find(x => x.name === name);
  if (!s) throw new Error(`unknown scenario ${name}`);
  test.skip(!s.targets.includes(platformOf(target)) && !s.targets.includes(target as Target), `${name} does not run on ${target}`);
  // cold start per scenario (R5): no SDK state or ID counters carried over
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
  // every app exports through the native core (bare: native-first init, Expo: JS-fallback init), so android-* compare
  // to `android` files and ios-* to `ios` (R13): one set of files proves both init paths equivalent (Task 28).
  // VERIFY_E2E_DRAFT=1 writes a missing expected file and still fails (review it, then rerun)
  const r = compareToExpected(name, platformOf(target), actual, {draft: process.env.VERIFY_E2E_DRAFT === '1'});
  if (!r.ok) throw new Error('\n' + r.report);
}

/** Taps the test-mode `flush` button (a JS `forceFlush()`) for the `n`th time and waits until it resolved. */
export async function tapFlush(screen: Screen, n: number, timeout = 10_000) {
  await screen.getByTestId('flush').tap();
  await expect(screen.getByTestId(`flush-done-${n}`)).toBeVisible({timeout});
}

/** Polls until `ok()` or the timeout; false on timeout. */
export async function until(ok: () => boolean, timeoutMs: number): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  while (!ok() && Date.now() < end) await new Promise(r => setTimeout(r, 250));
  return ok();
}

// The SDK's own lines: native (`RNOtel` tag / NSLog prefix) and JS (`[react-native-open-telemetry]`, ReactNativeJS).
// iOS: `log show` takes ~60 s per call on a CI runner, so lines are captured live by a `log stream` started in clearDeviceLog.
const iosStreams = new Map<string, {lines: string[]}>();

/** Device log lines containing `needle`, logged after the last clearDeviceLog (Android: logcat since the clear; iOS: the live stream). */
export function deviceLog(platform: 'android' | 'ios', deviceId: string, needle: string): string[] {
  const out =
    platform === 'android'
      ? execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-v', 'raw', '-s', 'RNOtel:I', 'ReactNativeJS:I'], {encoding: 'utf8'})
      : (iosStreams.get(deviceId)?.lines ?? []).join('\n');
  return out.split('\n').filter(l => l.includes(needle));
}

/** Starts a fresh log window for deviceLog (Android: every logcat buffer, events too). */
export async function clearDeviceLog(platform: 'android' | 'ios', deviceId: string): Promise<void> {
  if (platform === 'android') execFileSync('adb', ['-s', deviceId, 'logcat', '-b', 'all', '-c']);
  else {
    const state = {lines: [] as string[]};
    iosStreams.set(deviceId, state);
    const child = spawn(
      'xcrun',
      ['simctl', 'spawn', deviceId, 'log', 'stream', '--style', 'compact', '--level', 'info',
        '--predicate', 'process == "OpenTelemetryExample" AND (eventMessage CONTAINS "RNOtel" OR eventMessage CONTAINS "[react-native-open-telemetry]")'],
      {stdio: ['ignore', 'pipe', 'ignore']},
    );
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d: string) => state.lines.push(...d.split('\n')));
    child.unref();
    (child.stdout as any).unref?.();
    process.on('exit', () => child.kill());
    await new Promise(r => setTimeout(r, 3_000)); // let the stream attach before the tap
  }
}
