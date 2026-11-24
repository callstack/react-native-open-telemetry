import type {E2EConfig} from 'e2e';
import {mobile} from '@e2e-dev/mobile';

const bundleId = 'opentelemetry.example';
const example = '../../example';

export default {
  projectId: 'react-native-open-telemetry',
  tests: '*.e2e.ts',
  // one collector port: targets must not run at once
  workers: 1,
  retries: process.env.VERIFY_E2E_DRAFT === '1' ? 0 : 1, // a retry would pass against its own fresh draft (R1)
  timeout: 180_000,
  launchTimeout: 120_000,
  actionTimeout: 90_000, // CI simulators answer installs and taps slowly
  targets: [
    {
      name: 'android-bare',
      engine: mobile({platform: 'android', device: process.env.E2E_ANDROID_DEVICE}),
      app: {
        bundleId,
        appPath: process.env.E2E_ANDROID_APP ?? `${example}/android/app/build/outputs/apk/release/app-release.apk`,
      },
    },
    {
      name: 'ios-bare',
      engine: mobile({platform: 'ios', device: process.env.E2E_IOS_DEVICE}),
      app: {
        bundleId,
        appPath: process.env.E2E_IOS_APP ?? `${example}/ios/build/Build/Products/Release-iphonesimulator/OpenTelemetryExample.app`,
      },
    },
    // Dev builds (Debug + Metro), local only: fast-refresh-idempotent (Task 27). See VERIFY.md.
    ...(process.env.E2E_DEV === '1'
      ? [
          {
            name: 'android-dev',
            engine: mobile({platform: 'android', device: process.env.E2E_ANDROID_DEVICE}),
            app: {bundleId, appPath: `${example}/android/app/build/outputs/apk/debug/app-debug.apk`},
          },
          {
            name: 'ios-dev',
            engine: mobile({platform: 'ios', device: process.env.E2E_IOS_DEVICE}),
            app: {bundleId, appPath: `${example}/ios/build/Build/Products/Debug-iphonesimulator/OpenTelemetryExample.app`},
          },
        ]
      : []),
  ],
} satisfies E2EConfig;
