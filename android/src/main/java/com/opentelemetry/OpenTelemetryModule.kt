package com.opentelemetry

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = OpenTelemetryModule.NAME)
class OpenTelemetryModule(reactContext: ReactApplicationContext) :
  NativeOpenTelemetrySpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  companion object {
    const val NAME = "OpenTelemetry"
  }
}
