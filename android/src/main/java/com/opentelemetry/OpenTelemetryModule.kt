package com.opentelemetry

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = OpenTelemetryModule.NAME)
class OpenTelemetryModule(reactContext: ReactApplicationContext) :
  NativeOpenTelemetrySpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun exportTraces(spans: ReadableArray) {
      Log.d(NAME, "Spans size: ${spans.size()}")
  }

  override fun exportMetrics(metrics: ReadableArray) {
      Log.d(NAME, "Metrics size: ${metrics.size()}")
  }

  companion object {
    const val NAME = "OpenTelemetry"
  }
}
