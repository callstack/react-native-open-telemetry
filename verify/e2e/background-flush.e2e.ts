import {execFileSync} from 'node:child_process';
import {expect} from 'e2e';
import {bundleIdOf, clearDeviceLog, expectScenario, MOBILE, platformOf, tapFlush, test, until} from './harness';

// Spans handed off right before the app goes to background are exported without forceFlush() (§9.4). Test mode has
// no timed export (scheduleDelay 120 s), so within the wait only the background hook can have sent them.
test('background-flush', {platforms: MOBILE}, async ({app, screen, collector, device, target}) => {
  const {deviceId} = device.unstable_raw;
  const android = platformOf(target) === 'android';
  await expectScenario('background-flush', target, {app, screen, collector}, {
    afterDone: async () => {
      if (android) await clearDeviceLog('android', deviceId);
      await device.home();
      if (!(await until(() => collector.received() > 0, 15_000))) throw new Error('nothing exported within 15 s of going to background');
      // back in the foreground the app answers a tap at once: the background flush left the main thread free
      // foreground only (app.open() relaunches). A CI simulator's `simctl launch` can outlast agent-device's 15 s
      // xcrun timeout; the flush runs off the main thread (RNOtel.swift), so one retry, then the 2 s tap still proves it.
      const open = () => device.openApp(bundleIdOf(target));
      await open().catch(open);
      await tapFlush(screen, 1, 2_000);
    },
  });
  // and Android recorded no ANR for the app
  if (android)
    expect(execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-b', 'events', '-s', 'am_anr'], {encoding: 'utf8'})).not.toContain(
      bundleIdOf(target),
    );
});
