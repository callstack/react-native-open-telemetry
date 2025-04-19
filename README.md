# react-native-open-telemetry

Best in class observability brought to React Native.

* **OpenTelemetry** is a collection of APIs, SDKs, and tools developed by [OpenTelemetry](https://github.com/open-telemetry) to instrument, generate, collect, and export telemetry data. See [What is OpenTelemetry](https://opentelemetry.io/docs/what-is-opentelemetry/) for more information.
* **react-native-open-telemetry** is a library that allows you to easily use **OpenTelemetry's** JS and Native bindings inside your React Native app.

## Features

* **Telemetry without lock-in**. Send to **any OTLP compliant backend** including [vendors](https://opentelemetry.io/ecosystem/vendors/)
* [**Tracing** API](https://opentelemetry.io/docs/specs/otel/trace/api/)
* [**Metrics** API](https://opentelemetry.io/docs/specs/otel/metrics/api/)
* **Web**, **Android** (experimental) support with **iOS** coming soon
* Automatic **fetch instrumentation**

## Platform support

| Platform | Support |
| --- | --- |
| **web** | ☑️ Stable |
| **android** | ☑️ Stable JS with experimental Native 🏗️ |
| **ios** | ☑️ Stable JS with planned Native 👀 |

## Installation

```sh
npm install react-native-open-telemetry
```

## Usage

### 1. Start the JS SDK

See OpenTelemetry's JS documentation on [Traces](https://opentelemetry.io/docs/languages/js/instrumentation/#acquiring-a-tracer) and [Metrics](https://opentelemetry.io/docs/languages/js/instrumentation/#acquiring-a-meter) for more information on available APIs.

```js
import { openTelemetrySDK } from 'react-native-open-telemetry';

// Start the SDK
const sdk = openTelemetrySDK({
  debug: true,
  url: "https://my-collector.com:4317",
  name: "my-app",
  version: "1.0.0-alpha",
  environment: "development",
});

// Use available APIs
const meter = sdk.metrics.getMeter("my-js-meter", "1.0");

const promoCounter = meter.createCounter("my-promo-counter", {
  description: "A counter metric for my promo section"
});

function App() {
  function onPress() {
    promoCounter.add(1);
  }

  return <Button title="Press me" onPress={onPress} />
}
```

### 2. Start the native SDK (optional) 🚧

> [!IMPORTANT]
> This section is considered **highly experimental**.
> There's currently no support for bidirectional JS/Native communication and the `native` feature flag only marks an API that will become available.

**Android**

See OpenTelemetry's Android documentation on [Traces](https://opentelemetry.io/docs/languages/java/api/#tracerprovider) and [Metrics](https://opentelemetry.io/docs/languages/java/api/#meterprovider) for more information on available APIs.

```kt
import com.opentelemetry.OpenTelemetry

class MainApplication : Application(), ReactApplication {
    override fun onCreate() {
        super.onCreate()

        // Start the SDK
        OpenTelemetry.init(this) {
            debug = true
            url = "https://my-collector.com:4317"
            name = "my-app"
            version = "1.0.0"
            environment = "production"
        }

        // ..

        // Use available APIs
        val sdk = OpenTelemetry.get()
        val meter = sdk.getMeter("native-scope-name")
        val counter = meter.counterBuilder("native-counter").build()
        counter.add(14)
    }
}
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
