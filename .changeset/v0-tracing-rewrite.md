---
"react-native-open-telemetry": minor
---

v0: a rewrite around one trace across JS and native. Native-first init (`RNOtel.start` on Android and iOS) with a JS
fallback (`startReactNativeSdk`), a context patch that carries the active span through `await`, promises and timers,
and a `withOtel` helper for Metro. Removed (breaking): metrics, fetch instrumentation, session tagging and
the `openTelemetrySDK` init.
