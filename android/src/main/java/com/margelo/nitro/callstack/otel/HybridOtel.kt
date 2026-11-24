package com.margelo.nitro.callstack.otel

import androidx.annotation.Keep
import com.callstack.otel.RNOtel
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.HrTime
import com.callstack.otel.core.OtelCore
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.core.Promise
import com.callstack.otel.core.AttrValue as CoreValue
import com.callstack.otel.core.SeamAttribute as CoreAttribute
import com.callstack.otel.core.SeamEvent as CoreEvent
import com.callstack.otel.core.SeamLink as CoreLink
import com.callstack.otel.core.SeamScope as CoreScope
import com.callstack.otel.core.SeamSpan as CoreSpan
import com.callstack.otel.core.SeamSpanContext as CoreSpanContext
import com.callstack.otel.core.SeamStatus as CoreStatus

/** The seam, mapped 1:1 onto the Kotlin core. */
// Constructed from JNI by name (ReactNativeOpenTelemetryOnLoad.cpp): keep it through R8.
@DoNotStrip
@Keep
class HybridOtel : HybridOtelSpec() {
  override fun initialize(config: SeamConfig?): SeamInitResult {
    val r = RNOtel.initialize(config?.let {
      CoreConfig(
        serviceName = it.serviceName,
        serviceVersion = it.serviceVersion,
        resourceAttributes = attrs(it.resourceAttributes),
        exportUrl = it.exportUrl,
        exportHeaders = it.exportHeaders.mapNotNull { h -> h.value.asFifthOrNull()?.let { v -> h.key to v } }.toMap(),
      )
    })
    return SeamInitResult(r.alreadyInitialized, r.testMode, r.error)
  }

  /** JS thread: copy the structs and enqueue; SpanData is built on the export thread. */
  override fun handOff(spans: Array<SeamSpan>) {
    OtelCore.instance?.handOff(spans.map(::span))
  }

  // Off the JS and main threads; resolves even when native never initialized.
  override fun flush(timeoutMs: Double): Promise<Unit> = Promise.async {
    OtelCore.instance?.flush(timeoutMs.toLong())
    Unit
  }

  private fun span(s: SeamSpan) = CoreSpan(
    context = ctx(s.context),
    parentSpanId = s.parentSpanId,
    name = s.name,
    kind = s.kind.toInt(),
    start = HrTime.of(s.start),
    end = HrTime.of(s.end),
    attributes = attrs(s.attributes),
    events = s.events.map { CoreEvent(it.name, HrTime.of(it.time), attrs(it.attributes)) },
    links = s.links.map { CoreLink(ctx(it.context), attrs(it.attributes)) },
    status = CoreStatus(s.status.code.toInt(), s.status.message),
    scope = CoreScope(s.scope.name, s.scope.version, s.scope.schemaUrl, attrs(s.scope.attributes)),
  )

  private fun ctx(c: SeamSpanContext) = CoreSpanContext(c.traceId, c.spanId, c.traceFlags.toInt(), c.traceState)

  private fun attrs(a: Array<SeamAttribute>) = a.map { CoreAttribute(it.key, value(it.value)) }

  private fun value(v: AttrValue): CoreValue = when (v) {
    is AttrValue.First -> CoreValue.Bool(v.value)
    is AttrValue.Second -> CoreValue.Bools(v.value.asList())
    is AttrValue.Third -> CoreValue.Strs(v.value.asList())
    is AttrValue.Fourth -> CoreValue.Nums(v.value.asList())
    is AttrValue.Fifth -> CoreValue.Str(v.value)
    is AttrValue.Sixth -> CoreValue.Num(v.value)
  }
}
