import {execFileSync} from 'node:child_process';
import {expect} from 'e2e';
import {ANDROID_EXPORT_URL_FILE, clearDeviceLog, deviceLog, expectScenario, platformOf, test, until} from './harness';

const BAD_URL = 'not a url';
// Android: Application.onCreate cannot see launch arguments, so the example reads this file instead (test mode only).
// The app creates the directory itself (getExternalFilesDir on every test-mode launch, e.g. the harness warm-up),
// and the harness's install fixture removes a file a killed run left behind.
const ANDROID_FILE = ANDROID_EXPORT_URL_FILE;

// Native init failure (§4.4, §9.4): the example's native-first init gets an invalid export URL. The SDK reports it
// exactly once, the app keeps running on a no-op SDK, the no-op forceFlush() resolves (scenario-done), and nothing
// is exported (the expected file is empty).
test('native-init-failure', async ({app, screen, collector, device, target}) => {
  const platform = platformOf(target);
  const {deviceId} = device.unstable_raw;
  const shell = (cmd: string) => execFileSync('adb', ['-s', deviceId, 'shell', cmd]);
  try {
    await expectScenario('native-init-failure', target, {app, screen, collector}, {
      launch: async () => {
        await clearDeviceLog(platform, deviceId);
        if (platform === 'android') {
          shell(`echo '${BAD_URL}' > ${ANDROID_FILE} && chmod 644 ${ANDROID_FILE}`); // the app's own dir; 644 so it may read a shell-owned file
          await device.openApp('opentelemetry.example', {relaunch: true});
        } else {
          await device.openApp('opentelemetry.example', {relaunch: true, launchArguments: [`--otel-export-url=${BAD_URL}`]});
        }
      },
    });
    const lines = () => deviceLog(platform, deviceId, 'telemetry is off');
    await until(() => lines().length > 0, 10_000);
    await new Promise(r => setTimeout(r, 2_000)); // a second report would be in by now
    expect(lines()).toHaveLength(1);
  } finally {
    if (platform === 'android') shell(`rm -f ${ANDROID_FILE}`);
  }
});
