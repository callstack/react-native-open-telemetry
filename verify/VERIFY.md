# verify

`bun verify [stage…] [--e2e] [--update]` runs the stages in `verify/stages/`. `--e2e` adds the device stage
(`e2e`), which needs release builds of `example/` in test mode:

The example bundles the package through `exports` → `lib/` (R4), so build `lib/` first: the release builds embed
the JS bundle, and the e2e stage cannot rebuild it.

```sh
bun run prepare   # lib/
# Android (emulator booted)
cd example/android && OTEL_TEST_MODE=1 ./gradlew :app:assembleRelease -PotelTestMode=true
# iOS
cd example/ios && OTEL_TEST_MODE=1 pod install && OTEL_TEST_MODE=1 xcodebuild -workspace OpenTelemetryExample.xcworkspace \
  -scheme OpenTelemetryExample -configuration Release -sdk iphonesimulator -derivedDataPath build build
E2E_TARGET=android-bare bun verify --e2e e2e   # or ios-bare, android-expo, ios-expo, web; omit E2E_TARGET for all five
```

Web (`web` target) needs `lib/`, `bun install` in `example-expo/` and a Playwright Chromium
(`bunx e2e-web install chromium`); the runner exports and serves the Expo app for web itself (below).

The Expo app (`example-expo/`, `android-expo` / `ios-expo`) is CNG: `android/` and `ios/` are generated, not committed.

```sh
cd example-expo && bun install && OTEL_TEST_MODE=1 bunx expo prebuild --clean --no-install
cd android && OTEL_TEST_MODE=1 ./gradlew :app:assembleRelease     # otelTestMode=true comes from the prebuild
cd ../ios && OTEL_TEST_MODE=1 pod install && OTEL_TEST_MODE=1 xcodebuild -workspace OpenTelemetryExpo.xcworkspace \
  -scheme OpenTelemetryExpo -configuration Release -sdk iphonesimulator -derivedDataPath build build
```

The Kotlin and Swift cores have no host-side test runs: the `e2e` stage runs every scenario on Android and iOS
through the real seam and native core and compares against `<name>.android.otlp.json` / `<name>.ios.otlp.json`.

**iOS time floor (R22).** opentelemetry-swift 2.6 keeps times as `Date` and exports
`UInt64(timeIntervalSince1970 * 1e9)`, so whole-µs seam times come back on a ~238–256 ns grid, truncated
(measured once over `at(0…10_000)` and `at(1_000_000_000)`: max |error| 240 ns, 314 of 10 002 exact).
`*.ios.otlp.json` record these quantized values as emitted (deterministic); shapes ignore times.

**iOS vs Android/JS goldens.** Apart from times, the `ios` files differ only by what the opentelemetry-swift 2.6 OTLP
encoder (`SpanAdapter`) never writes: span `flags` (257), span `traceState`, link `flags`, link `traceState`, and the
scope `schemaUrl` on `ScopeSpans`. The core passes them all into `SpanData`; the exporter drops them. Accepted for v0
(no encoder reimplementation); `rich-span` exercises span flags, link flags/traceState and the scope `schemaUrl`.

**iOS `TRACEPARENT` (upstream caveat).** opentelemetry-swift reads a `TRACEPARENT` environment variable at provider
construction and makes it the parent of every root span, even with `setNoParent()`. Apps only see it when launched with
it (Xcode scheme, `SIMCTL_CHILD_TRACEPARENT`).

`verify/e2e/scenarios.e2e.ts` runs one test per scenario with runner `e2e`, not `pending`, on each target it lists,
except the scenarios with their own e2e file. Each test cold-starts the app (R5). e2e is compare-only;
On web, `forceFlush` latency follows the OTLP exporter's own retries (about 10 s worst case), not a native flush timeout; `collector-down` allows 10 s there.

`VERIFY_E2E_DRAFT=1` writes a **missing** `<name>.<platform>.otlp.json` from the device run and still fails the test
("drafted …, review it"); existing files are never overwritten. Draft runs have no retries, so a drafting run always ends red.
Each target compares to its platform's files (`android-*` → `android`, `ios-*` → `ios`, `web` → `web`): the bare app inits native
first (`RNOtel.start` in `MainApplication` / `AppDelegate`), the Expo app inits from JS (below), and ScenariosScreen
exports through `startReactNativeSdk` and the Kotlin or Swift core. One set of files for both apps is the proof that
the two init paths are equivalent. A scenario that only one app can run names targets (`android-bare`) instead of
platforms in `targets`.

**Fixtures by target kind (Task 23).** `harness.ts` has two chains: `test` (device targets: its auto `installed`
fixture and `target` name `device`, so every `test(…)` passes `{platforms: MOBILE}`) and `webTest` (a fresh browser
context per test; `target` is the platform, `web`). `anyTarget(title, body)` registers one body on both; e2e titles must
be unique, so the web copy is `web › <title>`.

**TestNative (R25, Task 26).** `cross-*` scenarios call `ctx.native`, the example-only Nitro HybridObject in
`example/modules/test-native/` (own `nitro.json`, podspec, `build.gradle`; autolinked through
`example/react-native.config.js`). It uses only the public `RNOtel` helpers. After editing its spec, regenerate with
`bun run codegen` in that directory (the patched root nitrogen) and commit `nitrogen/generated`.

**iOS pods (R24).** An app's Swift `AppDelegate` cannot `import ReactNativeOpenTelemetry`: the Nitro pod is built with
C++ interop and the app is not (Task 25 Step 0: `'functional' file not found` while building `NitroModules`). So
iOS ships two pods: `ReactNativeOpenTelemetryCore` (pure Swift: `ios/Core` + the public `RNOtel` in `ios/RNOtel`) and
the Nitro adapter `ReactNativeOpenTelemetry` (`ios/Adapter`), which depends on it and reaches the core's `package`
declarations through one `-package-name`. Autolinking links only the adapter, so the app's Podfile adds
`pod 'ReactNativeOpenTelemetryCore', :path => '<package dir>'`. Both linkages build: the default static libraries
(CI) and `USE_FRAMEWORKS=static` (checked locally in Task 25, not a CI job: e2e `ios-bare` 18/18 on that build).

**`performance.timeOrigin` on Hermes (X17, Task 13).** Defined on both platforms (RN 0.88.1 release, Hermes),
checked with a one-off `console.log` of `timeOrigin`, `performance.now()` and `Date.now()` at app start:
Android `timeOrigin + now()` = `Date.now()` within 1 ms; **iOS simulator `timeOrigin + now()` was ~23.9 h behind
`Date.now()`** (the monotonic clock under `now()` stopped while the host slept; `timeOrigin` stayed at simulator boot).
sdk-trace 3.1 is unaffected: each span recomputes `_performanceOffset = Date.now() - (now() + timeOrigin)` at start,
so explicit times, default times and `addEvent(name, perfNumber)` stay correct. Known limit: anything that turns
`performance.now()` values into wall-clock with `timeOrigin` alone (e.g. `@opentelemetry/core` `hrTime()` without
an argument) can be off by that skew on iOS.

The fake collector listens on port 4318; the app reaches it at `10.0.2.2` (Android emulator) or `localhost` (iOS simulator).

## Expo app (Task 28)

`example-expo/`: **Expo SDK 58** (`expo` 58.0.26), **React Native 0.88.1**, React 19.3.0, `react-native-nitro-modules`
0.37.2, all pinned exactly. SDK 58 is the newest Expo SDK (npm `latest`, 2026-11-24) and bundles the same RN as the bare
app. Built locally with Xcode 27.1; the CI jobs `e2e-android-expo` / `e2e-ios-expo` (`xcode-27`, Xcode 27.0) are
unproven until their first CI run.

- **Init: JS fallback.** No native init. `index.js` calls `startReactNativeSdk({serviceName: 'verify', exportConfig:
  {url, headers: {'x-api-key': 'test'}}})` (no `serviceVersion`, R2) before registering the bare example's
  `ScenariosScreen`, whose later `startReactNativeSdk()` calls get that first handle. Native reports `testMode` from its
  build flag; the config has no test fields.
- **Metro:** `withOtel(mergeConfig(getDefaultConfig(__dirname), …))` with Expo's `getDefaultConfig`; same single-copy
  resolver setup as the bare app (blocks the root's and `example/`'s React Native copies). Babel: `babel-preset-expo`
  plus the bare example's `OTEL_TEST_MODE` inline plugin.
- **Autolinking:** Expo autolinking reads `example-expo/react-native.config.js`, which points at the repo root and at
  the bare example's TestNative, so the `cross-*` scenarios run on Expo too.
- **Config plugins** (`app.json`): the package's own `react-native-open-telemetry` (`app.plugin.js`) adds
  `pod 'ReactNativeOpenTelemetryCore', :path => '../..'` to the Podfile (R24), as in any Expo app. Expo resolves it by
  package name: `example-expo`'s `postinstall` links `node_modules/react-native-open-telemetry` to the repo root (bun
  cannot install the root as a `file:` dependency: it looks for the root's `patches/` relative to the app). Then the
  example-only `example-expo/plugins/withOtelExample.js` sets `usesCleartextTraffic` (the collector is plain HTTP), adds
  the bundle task inputs, and with `OTEL_TEST_MODE=1` at prebuild writes `otelTestMode=true` to `gradle.properties`.
  iOS takes test mode at `OTEL_TEST_MODE=1 pod install`.
- **R8:** Expo release builds minify (`android.enableMinifyInReleaseBuilds=true`). The library now ships
  `android/consumer-rules.pro`: `-dontwarn` for otel-java's optional compile-only classes, and a keep rule for
  `io.opentelemetry.sdk.resources.**`, which otel-java's `ResourceMarshaler` reaches by reflection
  (`EntityUtil.getEntities`). Without it every export threw `Error calling getEntities on Resource` and nothing arrived.
- **Not on Expo:** `native-init-failure` (`targets: ['android-bare', 'ios-bare']`): the bad URL goes to the bare app's
  native init, and the Expo app has none. `fast-refresh-idempotent` runs on the bare dev builds only, locally.

## Web (Task 23)

The `web` target is the Expo app's Metro web export (`example-expo`, `expo export -p web`): its `ScenariosScreen`
through react-native-web 0.21.4 (react-dom 19.3.0). `index.js` inits first with
`startReactNativeSdk({serviceName: 'verify', exportConfig: {url: 'http://localhost:4318/v1/traces', headers: {'x-api-key':
'test'}}})`, so every scenario runs through the **web SDK** (own `TracerProvider`, `BatchSpanProcessor`, OTLP/proto
exporter, R7), not a harness provider. Metro resolves the package through its `exports` (`browser` →
`lib/module/index.web.js`); on web, `metro.config.js` maps `react-native-nitro-modules` to `nitro-stub.web.ts` (no
HybridObjects: no native `testMode` line, scenarios get no `native`).

- **Test mode:** `isTestModeBuild()` reads plain `process.env.OTEL_TEST_MODE` inside a `try` (a browser has no
  `process`). That one form is what the Babel plugin (`example/inlineTestMode.js`, on every platform) and Jest's real
  `process` both see. The e2e config builds with `OTEL_TEST_MODE=1`.
- **Runner:** the `web` target (`web({browser: 'chromium'})`) starts `bun run web:e2e` in `example-expo/`
  (`expo export -p web` + `expo serve` on `localhost:4173`); its log is `verify/e2e/.e2e/logs/web.log`. `app.restart()`
  opens a new page, the cold start (R5). The collector answers CORS (`OPTIONS` 204, `allow-headers: *`).
- **Probe:** `babel-preset-expo` keeps native `async` on web; `example-expo/babel.config.js` adds the two async
  plugins for the web platform, so the bundle has no native `async`/`for await`; no `com.callstack.context.degraded`
  scope attribute in any web file.
- **Files:** every `*.web.otlp.json` is byte-identical to the scenario's `.js` file (`collector-down`, `handoff-basic`,
  `odd-attributes` and `export-headers`, which have no `.js`, equal their `.android` file). The proto exporter and the web resource (`service.name` only in test mode)
  change nothing visible.
- **collector-down:** the OTel JS exporter retries a 503 inside the export (backoff 1 s ×1.5, ±20 %), so the first
  `flush` resolves after the three refusals (~4.7 s; up to 5.7 s): the web flush timeout is 10 s.
- **nest-timers-microtasks:** browsers have no `setImmediate`; there the `immediate` step is one more `setTimeout(0)`,
  so all runners keep one shape.
- **Not on web:** `cross-*` (TestNative is native), `native-init-failure` (bare native init), `flush-after-reload`
  (the native reload; a page reload drops the JS context, a different guarantee), `background-flush` (app
  background; the browser `pagehide` flush is not covered), `fast-refresh-idempotent`, `native test mode reaches initialize`.

## Failure scenarios (Task 27)

Each has its own e2e file (R10); the ScenariosScreen does not `forceFlush()` after `collector-down`,
`flush-after-reload` and `background-flush`, so the test decides what exports. Test-mode-only screen controls:
`flush` (a JS `forceFlush()`, shows `flush-done-<n>`), `reload` (`TestNative.reload()`) and `patch-identity`.

- **Test mode has no timed export.** Test-mode native cores set the batch processor's schedule delay to 120 s
  (default 5 s), so within a device test only a flush or the background hook sends anything. Without it,
  `background-flush` and `flush-after-reload` would pass on the timer alone.
- `collector-down`: `refuse(503, 3)` after `begin`, `scenario-done` within 2 s, then three `flush` taps (each
  resolves while the collector refuses); the span arrives once. Android: otel-java retries a 503 inside the export.
  **iOS (X6):** opentelemetry-swift 2.6's `OtlpHttpTraceExporter` does not retry; with its default
  `requeueOnFailure: true` it keeps a failed batch in memory and resends it on the next `export` or `flush` (our core
  flush calls both). So on iOS the span arrives on the first flush after the collector is back, not by itself; its
  batch processor never exports an empty queue. No exception needed, no hand-rolled retry.
- `native-init-failure`: the example's native init gets `exportUrl = "not a url"`, in test-mode builds only (R26).
  iOS: launch argument `--otel-export-url=not a url` (AppDelegate, `#if OTEL_TEST_MODE`; the Podfile adds the
  condition to the app target). Android: `Application.onCreate` cannot see launch arguments (they reach the
  Activity), so the test writes `/sdcard/Android/data/opentelemetry.example/files/otel-export-url` (mode 644, removed
  afterwards and before each install's warm-up launch) and `OtelInit.kt` (called from `MainApplication`) reads it. Asserted: exactly one log line with `telemetry is off` (native `RNOtel`
  plus JS `[react-native-open-telemetry]` lines), `scenario-done` (the no-op `forceFlush()` resolved), and the empty
  expected file. JS no longer repeats a native-first failure that native already reported (`alreadyInitialized`).
- `flush-after-reload`: `reload`, then `flush` must resolve within 5 s, the span arrives once.
  **Step 0:** `DevSettings.reload()` is a no-op in release builds (JS side, `__DEV__` only), on both platforms. The
  example's TestNative `reload()` calls `ReactHost.reload` / `RCTTriggerReloadCommandListeners`, the native reload
  that OTA updaters use, so this runs on the release builds, per PR, with no extra build.
- `background-flush`: `device.home()` right after `scenario-done`; something must arrive within 15 s. Android: no
  `am_anr` for the app in the events log. Checked: without `home()` nothing arrives within 15 s on either platform.
- `fast-refresh-idempotent` (dev builds + Metro: local only): each of two
  edits of `lib/module/setup.js` appends `globalThis.__otelRefreshes += 1`; Metro hot-updates it, it re-runs
  `installContextPatch`, and `patch-identity` must read `same refreshes=<n>` (`then`/`setTimeout` are still the
  functions first seen; a full reload would reset the count). Then `nest-after-await` must match its own expected
  file. The test edits `lib/`, so run `bun run prepare` first; a killed run leaves the extra line in
  `lib/module/setup.js`, which `bun run prepare` clears. Run it:

  ```sh
  cd example/android && OTEL_TEST_MODE=1 ./gradlew :app:assembleDebug -PotelTestMode=true
  cd example/ios && OTEL_TEST_MODE=1 xcodebuild -workspace OpenTelemetryExample.xcworkspace -scheme OpenTelemetryExample \
    -configuration Debug -sdk iphonesimulator -derivedDataPath build build
  cd example && OTEL_TEST_MODE=1 bunx react-native start   # keep running; Android also: adb reverse tcp:8081 tcp:8081
  E2E_DEV=1 bunx e2e run --config verify/e2e/e2e.config.ts --target android-dev,ios-dev fast-refresh-idempotent
  ```

  If watchman reports recrawls, restart Metro: a dead watch never delivers the edit.

## Android cold start with `RNOtel.start` (Task 24, 2026-11-24)

`adb shell am start -W -n opentelemetry.example/.MainActivity` after `am force-stop`, 6 launches each, Pixel_9
emulator (API 36, arm64), release test-mode build. `TotalTime` (ms):

| Build | runs | min | median |
| --- | --- | --- | --- |
| before (no `RNOtel.start`, JS-direct) | 178, 194, 401, 327, 228, 180 | 178 | 211 |
| after (`RNOtel.start` in `MainApplication.onCreate`) | 265, 206, 234, 293, 316, 191 | 191 | 250 |

Emulator noise (±100 ms between runs) is larger than the difference; `RNOtel.start` builds the resource, the
batch processor and the provider, but no exporter or OkHttp client (built on the first export, on the BSP thread).
Task 29 measures properly on a device.

## Device capability check (Task 7, 2026-11-23)

What Task 27 (reload, fast refresh, background flush) needs from agent-device.
iOS: iPhone 18 Pro simulator, iOS 27.0, Xcode 27.1, agent-device 0.21.36 (T3 device panel), RN 0.88.1 Debug build + Metro.

| Capability | iOS simulator | Android emulator (Pixel_9) |
| --- | --- | --- |
| JS reload | ✓ `agent-device metro reload` (Metro re-bundled; screen state reset). Release: native reload via TestNative (Task 27) | ✓ release: native reload via TestNative, e2e `flush-after-reload` (Task 27). `DevSettings.reload()` is a no-op in release |
| Fast refresh (dev build) | ✓ editing `ScenariosScreen.tsx` text showed on device with React state kept | ✓ e2e `fast-refresh-idempotent` on `android-dev` (Task 27) |
| Background and back | ✓ `agent-device home`, then `open opentelemetry.example`: UIKit logged the background task end and `UIApplicationWillEnterForegroundNotification`; state kept. `appstate` still says `runningForeground` after `home` (known iOS quirk, documented by e2e), so check lifecycle in the log, not `appstate` | ✓ `device.home()` in e2e `background-flush` (Task 27) |
| Read logs | ✓ `agent-device logs start/stop` captures the app's unified log, `NSLog` lines included (`RNOtel handOff …`). The e2e harness reads with `xcrun simctl spawn <udid> log show --predicate 'process == "OpenTelemetryExample" …'` | ✓ via the e2e harness: `adb logcat -d -s RNOtel:I` (tracer-bullet test green; the test was retired in Task 24, R14) |

**Blocker (Android, interactive only):** the T3 device panel could not open `Pixel_9`:
`Failed to allocate an emulator port for Pixel_9 … avdmanager: … Unable to locate a Java Runtime.`
The T3 host process has no `JAVA_HOME`, so `avdmanager list avd` fails. The emulator itself boots and the e2e runner
(`@e2e-dev/mobile`, agent-device 0.21.39) drives it fine. Reload / fast refresh / background on Android still need a
check before Task 27; fix the T3 host's Java (or run the check through an e2e test) and fill in the column. Task 27 filled it in through e2e tests.

## Scenarios

One file per guarantee in `verify/scenarios/`, named after it, with a hand-written `verify/expected/<name>.shape.json`
(the cross-platform parity contract). Exact `<name>.<platform>.otlp.json` files are drafted by the owning task with
`VERIFY_UPDATE=1` and reviewed by the author. `pending` scenarios report as `todo`; the owning task flips `pending` off.

Shapes use the JS runner's resource, `["service.name"]`. Native test mode builds the resource from config only and
the example inits with no `serviceVersion` (R2), so native-first device runs match the same shapes.

e2e targets are android, ios and web unless the Runners column names them.

| Scenario | Guarantee | Task | Runners | Status |
| --- | --- | --- | --- | --- |
| `nest-after-await` | a span after `await` is a child of the span active before it | 10 | jest, e2e | passing |
| `nest-timers-microtasks` | `setTimeout`/`setImmediate`/`queueMicrotask` callbacks keep their scheduling context, also after the parent ended | 10 | jest, e2e | passing |
| `nest-promise-all-race` | `Promise.all`/`race` branches and the code after them keep the parent | 10 | jest, e2e | passing |
| `concurrent-interleaved` | interleaved async jobs keep their own parents; work after the join is a root | 10 | jest, e2e | passing |
| `root-no-leak` | after a span's work ends, later work (fast path included) starts new roots | 10 | jest, e2e | passing |
| `captured-then` | exception: a `then` captured before the patch loses the parent | 10 | jest, e2e | passing |
| `async-generator` | async generator bodies and `for await` keep the parent | 10 | jest, e2e | passing |
| `error-in-callback` | a throwing callback still restores context | 10 | jest, e2e | passing |
| `never-settling-promise` | a never-settling promise does not leak its span into later work | 10 | jest, e2e | passing |
| `interval-new-root` | exception: each `setInterval` tick is a new root | 10 | jest, e2e | passing |
| `batching-shared-queue` | exception: a shared queue runs work as its first enqueuer (pinned wrong parent) | 10 | jest, e2e | passing |
| `interaction-manager` | `runAfterInteractions` callback is a child of the caller's span | 13 | e2e | pending: RN 0.88 removed `InteractionManager` |
| `nest-raf` | a `requestAnimationFrame` callback keeps its scheduling context | 13 | e2e | passing |
| `event-emitter-listener` | a synchronous `DeviceEventEmitter` listener is a child of the emitter's span | 13 | e2e (android, ios) | passing |
| `handoff-basic` | a span crosses the seam intact | 8, 15, 18 | e2e | passing |
| `rich-span` | every attribute type, events, links, status, scope survive the seam | 8, 15, 18 | jest, e2e | passing |
| `odd-attributes` | NaN, ±Infinity, -0, big ints, empty arrays survive the seam | 8, 15, 18 | e2e | passing |
| `export-headers` | configured export headers are sent on every request | 16, 19, 23, 24, 25 | e2e | passing |
| `cross-js-to-native` | a native span started from JS is a child of the JS span | 26 | e2e (android, ios) | passing |
| `cross-native-to-js` | a JS span started under a native span's context is its child | 26 | e2e (android, ios) | passing |
| `collector-down` | app never blocks; spans arrive exactly once when the collector is back | 23, 27 | e2e | passing |
| `native-init-failure` | one error log, no-op SDK, nothing exported | 27 | e2e (android-bare, ios-bare) | passing |
| `flush-after-reload` | `forceFlush()` resolves across a JS reload; spans arrive once | 27 | e2e (android, ios) | passing |
| `background-flush` | spans are exported on background without `forceFlush()` | 27 | e2e (android, ios) | passing |
| `fast-refresh-idempotent` | fast refresh does not stack the patch: `then`/`setTimeout` keep their identity across refreshes | 27 | e2e (android-dev, ios-dev; local only) | passing (local) |

### Adding a scenario

1. `verify/scenarios/<guarantee-id>.ts`: `export default scenario('<guarantee-id>', async ({tracer, at}) => {…}, opts)`.
   Explicit `at(µs)` start/end times on every span; parents through `context.active()` (`startActiveSpan`), not
   explicit parent contexts. `opts.runners` defaults to `['jest', 'e2e']`, `opts.targets` to
   `['android', 'ios', 'web']` (platforms or target names like `android-bare`; the e2e harness skips other targets); `pending: true` until it passes.
2. Hand-write `verify/expected/<guarantee-id>.shape.json` in exactly `shapeOf()`'s format (traces ordered by first
   span start, spans sorted by name, `kind` 1 = INTERNAL) and get it reviewed.
3. `bun verify` regenerates `verify/scenarios/index.ts`. Un-pend, draft the exact files with `VERIFY_UPDATE=1 bun verify`
   (the shape must already match), have the author review them, then `bun verify` must be green.
