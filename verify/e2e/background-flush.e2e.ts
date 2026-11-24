import {execFileSync} from 'node:child_process';
import {expect} from 'e2e';
import {clearDeviceLog, expectScenario, platformOf, test, until} from './harness';

// Spans handed off right before the app goes to background are exported without forceFlush() (§9.4). Test mode has
// no timed export (scheduleDelay 120 s), so within the wait only the background hook can have sent them.
test('background-flush', async ({app, screen, collector, device, target}) => {
  const {deviceId} = device.unstable_raw;
  const android = platformOf(target) === 'android';
  await expectScenario('background-flush', target, {app, screen, collector}, {
    afterDone: async () => {
      if (android) await clearDeviceLog('android', deviceId);
      await device.home();
      if (!(await until(() => collector.received() > 0, 15_000))) throw new Error('nothing exported within 15 s of going to background');
    },
  });
  // no ANR on Android: the ON_STOP flush only signals the export thread
  if (android)
    expect(execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-b', 'events', '-s', 'am_anr'], {encoding: 'utf8'})).not.toContain(
      'opentelemetry.example',
    );
});
