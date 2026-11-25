package com.margelo.nitro.callstack.otel

import androidx.annotation.Keep
import com.callstack.otel.RNOtel
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.OtelCore
import com.callstack.otel.core.attributesOf
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers

/** The seam: the core reads Nitro's structs directly. */
// Constructed from JNI by name (ReactNativeOpenTelemetryOnLoad.cpp): keep it through R8.
@DoNotStrip
@Keep
class HybridOtel : HybridOtelSpec() {
  override fun initialize(config: SeamConfig?): SeamInitResult {
    val r = RNOtel.initialize(config?.let {
      CoreConfig(
        serviceName = it.serviceName,
        serviceVersion = it.serviceVersion,
        resourceAttributes = attributesOf(it.resourceAttributes),
        exportUrl = it.exportUrl,
        exportHeaders = it.exportHeaders.mapNotNull { h -> h.value.asFifthOrNull()?.let { v -> h.key to v } }.toMap(),
      )
    })
    return SeamInitResult(r.alreadyInitialized, r.testMode, r.error)
  }

  /** JS thread: enqueue only; SpanData is built on the export thread. */
  override fun handOff(spans: Array<SeamSpan>) {
    OtelCore.instance?.handOff(spans)
  }

  // Off the JS and main threads (the join blocks, so on IO); resolves even when native never initialized.
  override fun flush(timeoutMs: Double): Promise<Unit> = Promise.async(io) {
    OtelCore.instance?.flush(timeoutMs.toLong())
    Unit
  }

  private val io = CoroutineScope(Dispatchers.IO)
}
