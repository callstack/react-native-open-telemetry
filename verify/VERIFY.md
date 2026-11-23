# verify

`bun verify [stage…] [--e2e] [--update]` runs the stages in `verify/stages/`. `--e2e` adds the device stage
(`e2e`), which needs release builds of `example/` in test mode:

```sh
# Android (emulator booted)
cd example/android && OTEL_TEST_MODE=1 ./gradlew :app:assembleRelease -PotelTestMode=true
# iOS
cd example/ios && OTEL_TEST_MODE=1 pod install && OTEL_TEST_MODE=1 xcodebuild -workspace OpenTelemetryExample.xcworkspace \
  -scheme OpenTelemetryExample -configuration Release -sdk iphonesimulator -derivedDataPath build build
E2E_TARGET=android-bare bun verify --e2e e2e   # or ios-bare; omit E2E_TARGET for both
```

The fake collector listens on port 4318; the app reaches it at `10.0.2.2` (Android emulator) or `localhost` (iOS simulator).

## Device capability check (Task 7, 2026-11-23)

What Task 27 (reload, fast refresh, background flush) needs from agent-device.
iOS: iPhone 18 Pro simulator, iOS 27.0, Xcode 27.1, agent-device 0.21.36 (T3 device panel), RN 0.88.1 Debug build + Metro.

| Capability | iOS simulator | Android emulator (Pixel_9) |
| --- | --- | --- |
| JS reload | ✓ `agent-device metro reload` (Metro re-bundled; screen state reset) | not checked: blocked, see below |
| Fast refresh (dev build) | ✓ editing `ScenariosScreen.tsx` text showed on device with React state kept | not checked |
| Background and back | ✓ `agent-device home`, then `open opentelemetry.example`: UIKit logged the background task end and `UIApplicationWillEnterForegroundNotification`; state kept. `appstate` still says `runningForeground` after `home` (known iOS quirk, documented by e2e), so check lifecycle in the log, not `appstate` | not checked |
| Read logs | ✓ `agent-device logs start/stop` captures the app's unified log, `NSLog` lines included (`RNOtel handOff …`). The e2e harness reads with `xcrun simctl spawn <udid> log show --predicate 'process == "OpenTelemetryExample" …'` | ✓ via the e2e harness: `adb logcat -d -s RNOtel:I` (tracer-bullet test green) |

**Blocker (Android, interactive only):** the T3 device panel could not open `Pixel_9`:
`Failed to allocate an emulator port for Pixel_9 … avdmanager: … Unable to locate a Java Runtime.`
The T3 host process has no `JAVA_HOME`, so `avdmanager list avd` fails. The emulator itself boots and the e2e runner
(`@e2e-dev/mobile`, agent-device 0.21.39) drives it fine. Reload / fast refresh / background on Android still need a
check before Task 27; fix the T3 host's Java (or run the check through an e2e test) and fill in the column.
