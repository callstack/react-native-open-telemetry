import {execFileSync} from 'node:child_process';
import {expect} from 'e2e';
import {bundleIdOf, clearDeviceLog, expectScenario, MOBILE, platformOf, tapFlush, test, until} from './harness';

test('background-flush', {platforms: MOBILE}, async ({app, screen, collector, device, target}) => {
  const {deviceId} = device.unstable_raw;
  const android = platformOf(target) === 'android';
  await expectScenario('background-flush', target, {app, screen, collector}, {
    afterDone: async () => {
      if (android) await clearDeviceLog('android', deviceId);
      await device.home();
      if (!(await until(() => collector.received() > 0, 15_000))) throw new Error('nothing exported within 15 s of going to background');
      const open = () => device.openApp(bundleIdOf(target));
      await open().catch(open);
      await tapFlush(screen, 1, 2_000);
    },
  });
  if (android)
    expect(execFileSync('adb', ['-s', deviceId, 'logcat', '-d', '-b', 'events', '-s', 'am_anr'], {encoding: 'utf8'})).not.toContain(
      bundleIdOf(target),
    );
});
