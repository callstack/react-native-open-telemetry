import {execFileSync} from 'node:child_process';
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
      await device.installApp();
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

/** Device log lines containing `needle`, logged after `since` (Android: after the last clearDeviceLog). */
export function deviceLog(platform: 'android' | 'ios', deviceId: string, needle: string, since: Date): string[] {
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19).replace('T', ' ');
  const out =
    platform === 'android'
      ? execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-v', 'raw', '-s', 'RNOtel:I'], {encoding: 'utf8'})
      : execFileSync(
          'xcrun',
          ['simctl', 'spawn', deviceId, 'log', 'show', '--start', local(since), '--style', 'compact',
            '--predicate', `process == "OpenTelemetryExample" AND eventMessage CONTAINS "${needle}"`],
          {encoding: 'utf8', maxBuffer: 1 << 26},
        );
  return out.split('\n').filter(l => l.includes(needle));
}

/** Starts a fresh log window; returns its start for deviceLog. */
export function clearDeviceLog(platform: 'android' | 'ios', deviceId: string): Date {
  if (platform === 'android') execFileSync('adb', ['-s', deviceId, 'logcat', '-c']);
  return new Date();
}
