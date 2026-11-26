# react-native-open-telemetry

Best in class observability brought to React Native.

* **OpenTelemetry** is a collection of APIs, SDKs, and tools developed by [OpenTelemetry](https://github.com/open-telemetry) to instrument, generate, collect, and export telemetry data. See [What is OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) for more information.
* **react-native-open-telemetry** is a library that allows you to easily use **OpenTelemetry's** JS and Native bindings inside your React Native app.

## Features

* **Telemetry without lock-in**. Send to **any OTLP compliant backend** including [vendors](https://opentelemetry.io/ecosystem/vendors/)
* [**Tracing** API](https://opentelemetry.io/docs/specs/otel/trace/api/)
* **One trace across JS and Native**, exported together
* Context carried through `await`, promises and timers
* **Web**, **Android** and **iOS** support

## Platform support

| Platform | Support |
| --- | --- |
| **web** | ☑️ Stable |
| **android** | ☑️ Stable JS and Native |
| **ios** | ☑️ Stable JS and Native |

Requires React Native **0.88+** (New Architecture, Hermes), Xcode **27+** and Android minSdk **26**.

## Installation

```sh
npm install react-native-open-telemetry react-native-nitro-modules
```

**iOS** — add the core pod to your app target in `ios/Podfile`, then run `pod install`:

```ruby
pod 'ReactNativeOpenTelemetryCore', :path => '../node_modules/react-native-open-telemetry'
```

**Expo** — use the config plugin instead, it adds that line for you:

```json
{ "expo": { "plugins": ["react-native-open-telemetry"] } }
```

**Metro** — wrap the merged config, so context tracking starts before any of your code:

```js
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config'); // Expo: expo/metro-config
const {withOtel} = require('react-native-open-telemetry/metro');

module.exports = withOtel(mergeConfig(getDefaultConfig(__dirname), {}));
```

On **Expo web**, also lower `async` in `babel.config.js`, otherwise spans lose their parent after `await`:

```js
module.exports = api => {
  const web = api.caller(c => c?.platform === 'web');
  return {
    presets: ['babel-preset-expo'],
    plugins: web ? ['@babel/plugin-transform-async-generator-functions', '@babel/plugin-transform-async-to-generator'] : [],
  };
};
```

## Usage

### 1. Start the native SDK (recommended)

Start in native code, before React Native, so you can trace from the very start of the app. It never throws: on bad config it logs an error and telemetry stays off.

See OpenTelemetry's [Java](https://opentelemetry.io/docs/languages/java/api/#tracerprovider) and [Swift](https://opentelemetry.io/docs/languages/swift/) documentation for more information on available APIs.

**Android**

```kt
import com.callstack.otel.RNOtel

class MainApplication : Application(), ReactApplication {
    override fun onCreate() {
        super.onCreate()

        // Start the SDK, before loadReactNative(this)
        RNOtel.start(this) {
            serviceName = "my-app"
            serviceVersion = "1.0.0"
            resourceAttributes = mapOf("deployment.environment.name" to "production")
            export {
                url = "https://my-collector.com:4318/v1/traces"
                headers = mapOf("x-api-key" to KEY)
            }
        }

        // Use available APIs
        val span = RNOtel.tracer("native-scope-name").spanBuilder("native-work").startSpan()
        span.end()
    }
}
```

**iOS**

```swift
import ReactNativeOpenTelemetryCore

// AppDelegate, application(_:didFinishLaunchingWithOptions:), before React Native starts
RNOtel.start { c in
  c.serviceName = "my-app"
  c.serviceVersion = "1.0.0"
  c.export = .init(url: "https://my-collector.com:4318/v1/traces", headers: ["x-api-key": KEY])
}
```

### 2. Start the JS SDK

Call it in `index.js`, before the app is registered. When native already started, it attaches to it and `exportConfig` is ignored. Otherwise (web, or an Expo app without native code) it starts everything itself.

See OpenTelemetry's JS documentation on [Traces](https://opentelemetry.io/docs/languages/js/instrumentation/#acquiring-a-tracer) for more information on available APIs.

```js
import { trace } from '@opentelemetry/api';
import { startReactNativeSdk } from 'react-native-open-telemetry';

// Start the SDK
startReactNativeSdk({
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  resourceAttributes: { 'deployment.environment.name': 'production' },
  exportConfig: { url: 'https://my-collector.com:4318/v1/traces', headers: { 'x-api-key': KEY } },
});

// Use available APIs
const tracer = trace.getTracer('my-js-tracer', '1.0');

function App() {
  async function onPress() {
    await tracer.startActiveSpan('promo-press', async span => {
      await fetchPromo(); // spans started in here keep their parent
      span.end();
    });
  }

  return <Button title="Press me" onPress={onPress} />
}
```

`url` is the OTLP/HTTP traces endpoint, used as given (no path is appended).

### 3. Connect JS and Native spans (optional)

Pass a W3C `traceparent` across your own native module. Parent the native span with `RNOtel.contextFrom(traceparent)`, or return `RNOtel.traceparentOf(span)` to JS to continue from native.

```ts
const { traceId, spanId, traceFlags } = span.spanContext();
MyNative.doWork(`00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`);
```

```kt
RNOtel.tracer("my.module").spanBuilder("native.work").setParent(RNOtel.contextFrom(traceparent)).startSpan()
```

## Try it locally

Run the official OpenTelemetry Collector with Jaeger:

```sh
docker compose -f example/collector/docker-compose.yaml up
```

Point `url` at `http://localhost:4318/v1/traces` (`10.0.2.2` on the Android emulator) and open Jaeger at http://localhost:16686.

## Known limitations

* Work batched through a shared queue (React's scheduler, debounce/throttle helpers) can get the wrong parent. Bind it yourself with `context.with(...)`.
* `setInterval` ticks start a new trace.
* **iOS** doesn't export span/link `flags`, `traceState` and the scope `schemaUrl`, and times are rounded to ~240 ns. Both come from [opentelemetry-swift](https://github.com/open-telemetry/opentelemetry-swift).

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
