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

`fast-jvm` replays every `verify/fixtures/<name>.handoff.json` through the Kotlin core (`android/core-jvm`, its own
Gradle wrapper) into a collector on a free port and compares `<name>.android.otlp.json`. The JVM tests run otel-java's
own OkHttp 5; devices run React Native's OkHttp 4.9.2.

`fast-swift` (macOS only; skips elsewhere) does the same through the Swift core: `swift test` over `Package.swift`
(`ios/Core`, tests in `ios/CoreTests`) into `<name>.ios.otlp.json`. Both stages share `harness/nativeReplay.ts`.

**iOS time floor (R22).** opentelemetry-swift 2.6 keeps times as `Date` and exports
`UInt64(timeIntervalSince1970 * 1e9)`, so whole-µs seam times come back on a ~238–256 ns grid, truncated:
`TimeRoundTripTests` measures `at(0…10_000)` and `at(1_000_000_000)` at **max |error| 240 ns, 314 of 10 002 exact**.
`*.ios.otlp.json` record these quantized values as emitted (deterministic); shapes ignore times.

**iOS vs Android/JS goldens.** Apart from times, the `ios` files differ only by what the opentelemetry-swift 2.6 OTLP
encoder (`SpanAdapter`) never writes: span `flags` (257), span `traceState`, link `flags`, link `traceState`, and the
scope `schemaUrl` on `ScopeSpans`. The core passes them all into `SpanData`; the exporter drops them. Accepted for v0
(no encoder reimplementation); today's fixtures exercise span flags, link flags/traceState and the scope `schemaUrl`.

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

## Scenarios

One file per guarantee in `verify/scenarios/`, named after it, with a hand-written `verify/expected/<name>.shape.json`
(the cross-platform parity contract). Exact `<name>.<platform>.otlp.json` files are drafted by the owning task with
`VERIFY_UPDATE=1` and reviewed by the author. `pending` scenarios report as `todo`; the owning task flips `pending` off.

Shapes use the JS runner's resource, `["service.name"]`. Native-first and device runs add resource keys
(`service.version`, and `telemetry.*` outside test mode): Tasks 24/25 (and 29 for `smoke-device`) revise those
shape files with the author.

e2e targets are android, ios and web unless the Runners column names them.

| Scenario | Guarantee | Task | Runners | Status |
| --- | --- | --- | --- | --- |
| `smoke-js` | the JS pipeline exports a span | 7 | jest | passing |
| `nest-after-await` | a span after `await` is a child of the span active before it | 10 | jest, e2e | pending |
| `nest-timers-microtasks` | `setTimeout`/`setImmediate`/`queueMicrotask` callbacks keep their scheduling context, also after the parent ended | 10 | jest, e2e | pending |
| `nest-promise-all-race` | `Promise.all`/`race` branches and the code after them keep the parent | 10 | jest, e2e | pending |
| `concurrent-interleaved` | interleaved async jobs keep their own parents; work after the join is a root | 10 | jest, e2e | pending |
| `root-no-leak` | after a span's work ends, later work (fast path included) starts new roots | 10 | jest, e2e | pending |
| `captured-then` | exception: a `then` captured before the patch loses the parent | 10 | jest, e2e | pending |
| `async-generator` | async generator bodies and `for await` keep the parent | 10 | jest, e2e | pending |
| `error-in-callback` | a throwing callback still restores context | 10 | jest, e2e | pending |
| `never-settling-promise` | a never-settling promise does not leak its span into later work | 10 | jest, e2e | pending |
| `interval-new-root` | exception: each `setInterval` tick is a new root | 10 | jest, e2e | pending |
| `batching-shared-queue` | exception: a shared queue runs work as its first enqueuer (pinned wrong parent) | 10 | jest, e2e | pending |
| `degraded-probe` | native `await` → degraded scope attribute, spans after `await` are roots | 11 | jest-degraded | passing |
| `interaction-manager` | `runAfterInteractions` callback is a child of the caller's span | 13 | e2e | pending |
| `nest-raf` | a `requestAnimationFrame` callback keeps its scheduling context | 13 | e2e | pending |
| `event-emitter-listener` | a synchronous `DeviceEventEmitter` listener is a child of the emitter's span | 13 | e2e (android, ios) | pending |
| `handoff-basic` | a span crosses the seam intact | 8, 15, 18 | jest, e2e | passing (js) |
| `rich-span` | every attribute type, events, links, status, scope survive the seam | 8, 15, 18 | jest, e2e | passing (js) |
| `odd-attributes` | NaN, ±Infinity, -0, big ints, empty arrays survive the seam | 8, 15, 18 | jest, e2e | passing (js) |
| `export-headers` | configured export headers are sent on every request | 16, 19 | e2e | pending |
| `cross-js-to-native` | a native span started from JS is a child of the JS span | 26 | e2e (android, ios) | pending |
| `cross-native-to-js` | a JS span started under a native span's context is its child | 26 | e2e (android, ios) | pending |
| `collector-down` | app never blocks; spans arrive exactly once when the collector is back | 27 | e2e | pending |
| `native-init-failure` | one error log, no-op SDK, nothing exported | 27 | e2e (android, ios) | pending |
| `flush-after-reload` | `forceFlush()` resolves across a JS reload; spans arrive once | 27 | e2e (android, ios) | pending |
| `background-flush` | spans are exported on background without `forceFlush()` | 27 | e2e (android, ios) | pending |
| `fast-refresh-idempotent` | fast refresh does not stack the patch: `then`/`setTimeout` keep their identity across refreshes | 27 | e2e | pending |
| `smoke-device` | production pipeline (no test mode) exports `smoke` spans | 29 | e2e (android, ios) | pending |
| `perf-budget` | hand-off p50 < 100 µs/span, patch ratio < 3× (`artifacts/perf.json`, no shape) | 29 | e2e (android) | pending |

### Adding a scenario

1. `verify/scenarios/<guarantee-id>.ts`: `export default scenario('<guarantee-id>', async ({tracer, at}) => {…}, opts)`.
   Explicit `at(µs)` start/end times on every span; parents through `context.active()` (`startActiveSpan`), not
   explicit parent contexts. `opts.runners` defaults to `['jest', 'e2e']` (`'jest-degraded'` is the native-`async` project), `opts.targets` to
   `['android', 'ios', 'web']` (the e2e harness skips other targets); `pending: true` until it passes.
2. Hand-write `verify/expected/<guarantee-id>.shape.json` in exactly `shapeOf()`'s format (traces ordered by first
   span start, spans sorted by name, `kind` 1 = INTERNAL) and get it reviewed.
3. `bun verify` regenerates `verify/scenarios/index.ts`. Un-pend, draft the exact files with `VERIFY_UPDATE=1 bun verify`
   (the shape must already match), have the author review them, then `bun verify` must be green.
