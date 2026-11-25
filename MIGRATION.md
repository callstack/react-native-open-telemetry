# Migrating from 0.2 to v0 (0.3.0)

v0 is a rewrite. It keeps tracing, and JS and native spans now share one trace. It removes everything else that 0.2
had. The version stays in 0.x (0.2.0 → 0.3.0), but expect breaking changes.

| 0.2 | v0 |
| --- | --- |
| `openTelemetrySDK(options)` (JS) | `startReactNativeSdk(config)`. See [Init](#init) |
| Android `com.opentelemetry.OpenTelemetry.init(this) { … }` | `com.callstack.otel.RNOtel.start(this) { … }` |
| iOS: JS only | `RNOtel.start { c in … }` in `AppDelegate` (native-first), or the JS init |
| Metrics (JS `sdk.metrics.getMeter`, Android `getMeter`) | **Removed.** Returns in v1 |
| Fetch instrumentation (automatic) | **Removed.** Network instrumentation returns in v1 |
| Session tagging (`features.session.getSessionId`) | **Removed.** Sessions return in v1. Interim: your own `SpanProcessor` (below) |
| `debug: true` (console exporters) | Pass a console exporter in `spanProcessors` (below) |
| W3C trace-context + baggage propagators registered globally | Not registered. Register one yourself if you inject headers |

## New requirements

- React Native 0.88+, New Architecture, Hermes, and the peer `react-native-nitro-modules` ~0.37.
- iOS: add `pod 'ReactNativeOpenTelemetryCore', :path => '../node_modules/react-native-open-telemetry'` to the
  Podfile. On Expo, add the `"react-native-open-telemetry"` config plugin instead. See the [README](README.md#install).
- Android: minSdk 26.
- Metro: wrap the merged config with `withOtel` from `react-native-open-telemetry/metro`. It runs the context patch
  before any app module. Without it, the patch installs at the package import, and only code that runs before that
  import loses parents.
- Expo web: also lower `async` for the web platform in `babel.config.js` (see the
  [README](README.md#metro-helper)). Without it, context is lost after a native `await`.

## Init

```ts
// 0.2
import {openTelemetrySDK} from 'react-native-open-telemetry';
const api = openTelemetrySDK({url, name: 'shop', version: '1.4.0', environment: 'prod', debug: true});
const tracer = api.trace.getTracer('app');

// v0
import {trace} from '@opentelemetry/api';
import {startReactNativeSdk} from 'react-native-open-telemetry';
const {forceFlush, shutdown} = startReactNativeSdk({
  serviceName: 'shop',
  serviceVersion: '1.4.0',
  resourceAttributes: {'deployment.environment.name': 'prod'},
  exportConfig: {url, headers: {}},
});
const tracer = trace.getTracer('app');
```

| 0.2 option | v0 |
| --- | --- |
| `name` / `version` | `serviceName` / `serviceVersion` |
| `environment` | `resourceAttributes: {'deployment.environment.name': …}`. 0.2 JS defaulted it to `process.env.NODE_ENV`; v0 sets no default, so pass it yourself. 0.2 Android wrote it as `environment` (default `development`) |
| `url` | `exportConfig.url` (JS) or `export { url }` (native). It is the OTLP **HTTP** traces endpoint, used as given (usually `https://host:4318/v1/traces`). 0.2 Android exported gRPC (4317); v0 sends OTLP/HTTP protobuf everywhere |
| `native` | Gone. Init natively with `RNOtel.start` instead. JS then attaches to it |
| return value (the `@opentelemetry/api` module) | `{tracerProvider, forceFlush, shutdown}`. Import `@opentelemetry/api` yourself |

0.2 also set `os.name`/`os.version` from `Platform`. On mobile, v0 builds the resource natively (service attributes,
your `resourceAttributes`, the otel SDK defaults and `telemetry.distro.*`). Pass anything else in
`resourceAttributes`.

On Android, the native call changes shape:

```kotlin
// 0.2
OpenTelemetry.init(this) { url = "https://collector:4317"; name = "shop"; version = "1.0.0"; environment = "prod" }

// v0
RNOtel.start(this) {
  serviceName = "shop"; serviceVersion = "1.0.0"
  resourceAttributes = mapOf("deployment.environment.name" to "prod")
  export { url = "https://collector:4318/v1/traces" }
}
```

v0 does not set `GlobalOpenTelemetry`. For native spans, use `RNOtel.tracer(name)`. 0.2's Android `debug` (on by
default, through otel-java's logging exporters) is gone, and v0 has no native console exporter. Use the JS console
processor below for JS spans, or point the export at a local Collector with the `debug` exporter.

## Interim replacements

These snippets use upstream OpenTelemetry APIs only. This package does not test them.

**Console output** (was `debug: true`):

```ts
import {SimpleSpanProcessor, ConsoleSpanExporter} from '@opentelemetry/sdk-trace';
startReactNativeSdk({/* … */, spanProcessors: [new SimpleSpanProcessor(new ConsoleSpanExporter())]});
```

**Session id** (was `features.session`). This covers JS spans only. Native spans get sessions in v1.

```ts
const sessionProcessor = {
  onStart: span => { const id = getSessionId(); if (id) span.setAttribute('session.id', id); },
  onEnd() {}, forceFlush: () => Promise.resolve(), shutdown: () => Promise.resolve(),
};
startReactNativeSdk({/* … */, spanProcessors: [sessionProcessor]});
```

**Fetch spans:** v1 brings network instrumentation for XHR and native OkHttp/URLSession. Until then, you can register
upstream `@opentelemetry/instrumentation-fetch` yourself against the global tracer provider.

**Metrics:** v1. Until then, run `@opentelemetry/sdk-metrics` with its own exporter next to this SDK.
