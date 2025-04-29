package com.opentelemetry

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import io.opentelemetry.context.Context

@ReactModule(name = OpenTelemetryModule.NAME)
class OpenTelemetryModule(reactContext: ReactApplicationContext) :
    NativeOpenTelemetrySpec(reactContext) {

    override fun getName(): String {
        return NAME
    }

    override fun setContext(carrier: ReadableMap) {
        if (carrier.toHashMap().isEmpty()) {
            Context.root().makeCurrent()
            return
        }

        val sdk = OpenTelemetry.get()
        val getter = RNTextMapGetter()
        val currentContext = Context.current()
        val extractedContext =
            sdk.propagators.textMapPropagator.extract(currentContext, carrier, getter)
        extractedContext.makeCurrent()
    }

    companion object {
        const val NAME = "OpenTelemetry"
    }
}
