import type {E2EConfig} from 'e2e';
import {mobile} from '@e2e-dev/mobile';
import {web} from '@e2e-dev/web';

const bundleId = 'opentelemetry.example';
const example = '../../example';
const expo = '../../example-expo';

export default {
  projectId: 'react-native-open-telemetry',
  tests: '*.e2e.ts',
  workers: 1,
  retries: process.env.VERIFY_E2E_DRAFT === '1' ? 0 : 1,
  timeout: 180_000,
  launchTimeout: 120_000,
  actionTimeout: 90_000,
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
    {
      name: 'android-expo',
      engine: mobile({platform: 'android', device: process.env.E2E_ANDROID_DEVICE}),
      app: {
        bundleId: 'opentelemetry.example.expo',
        appPath: process.env.E2E_ANDROID_EXPO_APP ?? `${expo}/android/app/build/outputs/apk/release/app-release.apk`,
      },
    },
    {
      name: 'ios-expo',
      engine: mobile({platform: 'ios', device: process.env.E2E_IOS_DEVICE}),
      app: {
        bundleId: 'opentelemetry.example.expo',
        appPath: process.env.E2E_IOS_EXPO_APP ?? `${expo}/ios/build/Build/Products/Release-iphonesimulator/OpenTelemetryExpo.app`,
      },
    },
    {
      name: 'web',
      engine: web({browser: 'chromium'}),
      app: {
        url: 'http://localhost:4173',
        command: {
          executable: 'bun',
          args: ['run', 'web:e2e'],
          cwd: expo,
          env: {OTEL_TEST_MODE: '1'},
          log: '.e2e/logs/web.log',
          startupTimeout: 120_000,
        },
      },
    },
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
