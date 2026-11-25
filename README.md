# react-native-open-telemetry

OpenTelemetry tracing for React Native (iOS, Android) and web. JS spans and native spans share one trace and
export together over OTLP/HTTP to any OTLP backend.

v0 is tracing only. If you used 0.x, read [MIGRATION.md](MIGRATION.md) first.

## Requirements

- React Native **0.88+** (0.88.1 is verified on every PR), New Architecture, Hermes
- `react-native-nitro-modules` **~0.37**
- iOS: Xcode **27.0+** (verified; Xcode 16.4 fails on the Swift packages' tools versions, Xcode 26 is untested)
- Android: minSdk **26**

## Install

```sh
npm install react-native-open-telemetry react-native-nitro-modules
```

### iOS (bare)

Autolinking links only the Nitro adapter pod. Add the core pod to your app target in `ios/Podfile` yourself, then run
`pod install`:

```ruby
target 'MyApp' do
  pod 'ReactNativeOpenTelemetryCore', :path => '../node_modules/react-native-open-telemetry'
  # ...
end
```

### Expo (prebuild / CNG)

Expo regenerates the Podfile, so the package ships a config plugin that adds that one line:

```json
{ "expo": { "plugins": ["react-native-open-telemetry"] } }
```

That is all the plugin does. Expo apps usually init from JS (below).

### Android

Nothing to add. The library's R8 consumer rules ship with it and apply automatically.

## Init

### Native-first (preferred)

Start the SDK in native code, before React Native, so you can trace from the very start of the app. On Android it
does nothing outside the main process. It never throws: on bad config it logs one error and telemetry stays off.

```kotlin
// android: MainApplication.onCreate, before loadReactNative(this)
import com.callstack.otel.RNOtel

RNOtel.start(this) {
  serviceName = "shop"
  serviceVersion = BuildConfig.VERSION_NAME
  resourceAttributes = mapOf("deployment.environment.name" to "prod")
  export {
    url = "https://collector.example.com:4318/v1/traces"
    headers = mapOf("x-api-key" to KEY)
  }
}
```

```swift
// ios: AppDelegate, application(_:didFinishLaunchingWithOptions:), before React Native starts
import ReactNativeOpenTelemetryCore

RNOtel.start { c in
  c.serviceName = "shop"
  c.serviceVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
  c.export = .init(url: "https://collector.example.com:4318/v1/traces", headers: ["x-api-key": KEY])
}
```

Then call `startReactNativeSdk()` in JS too. It attaches to the native SDK. If you pass an `exportConfig`, it is
ignored and you get one warning.

### JS (fallback on mobile, the only init on web)

If no native init ran, as in an Expo app without native code, `startReactNativeSdk` starts native itself. You lose
only the spans from before JS starts.

```ts
// index.js, before the app is registered
import {startReactNativeSdk} from 'react-native-open-telemetry';

const {tracerProvider, forceFlush, shutdown} = startReactNativeSdk({
  serviceName: 'shop',
  serviceVersion: '1.4.0',
  resourceAttributes: {'deployment.environment.name': 'prod'},
  exportConfig: {url: 'https://collector.example.com:4318/v1/traces', headers: {'x-api-key': KEY}},
  spanProcessors: [/* stock @opentelemetry/sdk-trace SpanProcessors, optional */],
});
```

The returned `tracerProvider` is registered globally, so `trace.getTracer(...)` from `@opentelemetry/api` works. On
mobile, `shutdown()` stops only the JS provider, never the native one. A missing or invalid config logs one error
and returns a no-op handle. The SDK never throws into your app.

### Endpoint

`url` (`exportConfig.url` in JS, `export.url` natively) is the OTLP/HTTP traces endpoint, used as given, for example
`https://host:4318/v1/traces`. No path is appended. It works the same on Android, iOS and web.

### Try it with the official Collector

```sh
docker compose -f example/collector/docker-compose.yaml up
```

This runs the OpenTelemetry Collector with OTLP/HTTP on port 4318 and Jaeger at http://localhost:16686. Point `url` at
`http://localhost:4318/v1/traces` (the Android emulator reaches the host at `10.0.2.2`). The Collector also prints
every span it receives.

## Metro helper

The context patch must run before any app module. Web bundles also must not use native `async`, which the patch cannot
see through.

**Metro** (`metro.config.js`): wrap the **merged** config. If you wrap only your own config, React Native's default
`InitializeCore` entry is dropped.

```js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config'); // Expo: expo/metro-config
const {withOtel} = require('react-native-open-telemetry/metro');

const config = {/* yours */};
module.exports = withOtel(mergeConfig(getDefaultConfig(__dirname), config));
```

Metro's `withOtel` only orders the setup: it runs the patch before any app module. React Native's Babel preset already
compiles `async` down. Without the helper, the patch still installs when your code imports the package. Only code
that ran before that import, such as React's scheduler capturing timers, loses its parent.

**Web (Expo web, Metro).** Use the same Metro `withOtel`. `babel-preset-expo` keeps native `async` on web, so lower
it there in `babel.config.js`:

```js
module.exports = api => {
  const web = api.caller(c => c?.platform === 'web');
  return {
    presets: ['babel-preset-expo'],
    plugins: web ? ['@babel/plugin-transform-async-generator-functions', '@babel/plugin-transform-async-to-generator'] : [],
  };
};
```

Without it, the startup probe logs an error (`console.error`) and marks the JS tracers with
`com.callstack.context.degraded=true`. Parents are then lost after `await`, but never wrong.

## Native helpers and crossing the boundary

Both platforms expose the same small API next to `start`:

| | Android (`com.callstack.otel.RNOtel`) | iOS (`RNOtel`) |
| --- | --- | --- |
| Tracer on the native provider (no-op before init) | `RNOtel.tracer(name, version?)` | `RNOtel.tracer(name, version:)` |
| W3C `traceparent` → parent (invalid → root) | `RNOtel.contextFrom(traceparent)` → `Context` | `RNOtel.contextFrom(traceparent:)` → `SpanContext?` |
| Span → `traceparent` | `RNOtel.traceparentOf(span)` | `RNOtel.traceparentOf(span)` |

JS → native: pass the active span's `traceparent` to your native module, and parent the native span with
`contextFrom`:

```ts
const {traceId, spanId, traceFlags} = span.spanContext();
MyNative.doWork(`00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`);
```

```kotlin
RNOtel.tracer("my.module").spanBuilder("native.work").setParent(RNOtel.contextFrom(traceparent)).startSpan()
```

```swift
let b = RNOtel.tracer("my.module").spanBuilder(spanName: "native.work")
if let parent = RNOtel.contextFrom(traceparent: traceparent) { b.setParent(parent) } else { b.setNoParent() }
```

Native → JS: return `RNOtel.traceparentOf(span)`, and start the JS span under it:

```ts
const [, traceId, spanId, flags] = MyNative.doWork().split('-');
const parent = trace.wrapSpanContext({traceId, spanId, traceFlags: parseInt(flags, 16), isRemote: false});
context.with(trace.setSpan(context.active(), parent), () => tracer.startSpan('js.after_native').end());
```

## Context guarantees

The active context carries through `await`, promise chains (`then`/`catch`/`finally`), `setTimeout`,
`setImmediate`, `queueMicrotask` and `requestAnimationFrame`. **No span gets a wrong parent through `await`, promise
or timer flows.** A callback that runs after its parent ended is still attached to that parent.

Documented exceptions:

- **Shared queues.** A queue that is flushed once runs everyone's work in the context of whoever enqueued first:
  React's scheduler and batching, debounce/throttle helpers, store notifiers. Those spans can get the wrong parent.
  Bind the context yourself with `context.bind(ctx, fn)` or `context.with(...)` from `@opentelemetry/api`.
- **`setInterval`.** Ticks run in `ROOT_CONTEXT`, so each tick's spans start a new trace. They do not join the trace
  that registered the interval, and v0 adds no link back to it.
- **Code that captured `Promise.prototype.then` before the patch ran** (without the Metro helper, code that runs before the package import) runs
  at ROOT and loses its parent. It never gets a wrong one.
- **Native `async`** (a web bundle without the Babel plugins above, a future Hermes that keeps `async`) loses parents after
  `await`. The startup probe detects this and sets `com.callstack.context.degraded=true` on the JS tracers' scope.

## Known limits (v0)

- **iOS OTLP:** the opentelemetry-swift encoder never writes span `flags`, span `traceState`, link `flags`/`traceState`
  or the scope `schemaUrl`.
- **iOS times** are quantized to about 240 ns, because opentelemetry-swift stores them as `Date`.
- **iOS `TRACEPARENT`:** opentelemetry-swift reads a `TRACEPARENT` environment variable and makes it the parent of
  every root span. Do not launch the app with it set.
- `requestIdleCallback` is not patched.
- `InteractionManager` has no coverage: React Native 0.88 removed it.
- **Web:** the flush on browser `pagehide` is not tested.

## Releasing

Maintainers: see [CONTRIBUTING.md](CONTRIBUTING.md#publishing-to-npm).

## Verification

Every guarantee above is a scenario with expected OTLP output, checked on Android, iOS and web. See
[verify/VERIFY.md](verify/VERIFY.md).

## Contributing

See the [contributing guide](CONTRIBUTING.md).

## License

MIT
