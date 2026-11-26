import {execFileSync} from 'node:child_process';
import {expect} from 'e2e';
import {ANDROID_EXPORT_URL_FILE, clearDeviceLog, deviceLog, expectScenario, MOBILE, platformOf, test, until} from './harness';

const BAD_URL = 'not a url';
const ANDROID_FILE = ANDROID_EXPORT_URL_FILE;

test('native-init-failure', {platforms: MOBILE}, async ({app, screen, collector, device, target}) => {
  const platform = platformOf(target) as 'android' | 'ios';
  const {deviceId} = device.unstable_raw;
  const shell = (cmd: string) => execFileSync('adb', ['-s', deviceId, 'shell', cmd]);
  try {
    await expectScenario('native-init-failure', target, {app, screen, collector}, {
      launch: async () => {
        await clearDeviceLog(platform, deviceId);
        if (platform === 'android') {
          shell(`echo '${BAD_URL}' > ${ANDROID_FILE} && chmod 644 ${ANDROID_FILE}`);
          await device.openApp('opentelemetry.example', {relaunch: true});
        } else {
          await device.openApp('opentelemetry.example', {relaunch: true, launchArguments: [`--otel-export-url=${BAD_URL}`]});
        }
      },
    });
    const lines = () => deviceLog(platform, deviceId, 'telemetry is off');
    await until(() => lines().length > 0, 10_000);
    await new Promise(r => setTimeout(r, 2_000));
    expect(lines()).toHaveLength(1);
  } finally {
    if (platform === 'android') shell(`rm -f ${ANDROID_FILE}`);
  }
});
