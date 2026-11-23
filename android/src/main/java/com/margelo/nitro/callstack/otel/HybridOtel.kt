package com.margelo.nitro.callstack.otel

import android.util.Log
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter

/** Tracer-bullet stub (Task 7): proves the seam and the otel-java link; the real adapter is Task 24. */
// Constructed from JNI by name (ReactNativeOpenTelemetryOnLoad.cpp): keep it through R8.
@DoNotStrip
@Keep
class HybridOtel : HybridOtelSpec() {
  override fun initialize(config: SeamConfig?): SeamInitResult {
    // Touch otel-java + its OkHttp sender so a broken dependency fails here, not in Task 24.
    OtlpHttpSpanExporter.builder().build().shutdown()
    return SeamInitResult(alreadyInitialized = false, testMode = BuildConfig.OTEL_TEST_MODE, error = null)
  }

  override fun handOff(spans: Array<SeamSpan>) {
    Log.i(
      "RNOtel",
      "RNOtel handOff spans=${spans.size} attrs=${spans.sumOf { it.attributes.size }} " +
        "events=${spans.sumOf { it.events.size }} links=${spans.sumOf { it.links.size }}",
    )
  }

  override fun flush(timeoutMs: Double): Promise<Unit> = Promise.resolved(Unit)
}
