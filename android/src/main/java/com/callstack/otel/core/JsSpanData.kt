package com.callstack.otel.core

import com.margelo.nitro.callstack.otel.SeamSpan
import com.margelo.nitro.callstack.otel.SeamSpanContext
import io.opentelemetry.api.trace.SpanContext
import io.opentelemetry.api.trace.SpanKind
import io.opentelemetry.api.trace.StatusCode
import io.opentelemetry.api.trace.TraceFlags
import io.opentelemetry.api.trace.TraceState
import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.sdk.common.InstrumentationLibraryInfo
import io.opentelemetry.sdk.common.InstrumentationScopeInfo
import io.opentelemetry.sdk.resources.Resource
import io.opentelemetry.sdk.trace.ReadableSpan
import io.opentelemetry.sdk.trace.data.EventData
import io.opentelemetry.sdk.trace.data.LinkData
import io.opentelemetry.sdk.trace.data.SpanData
import io.opentelemetry.sdk.trace.data.StatusData

private fun traceState(s: String?): TraceState {
  if (s.isNullOrEmpty()) return TraceState.getDefault()
  val b = TraceState.builder()
  // the builder puts each new entry first, so add the W3C list back to front
  for (kv in s.split(',').asReversed()) {
    val i = kv.indexOf('=')
    if (i > 0) b.put(kv.substring(0, i).trim(), kv.substring(i + 1).trim())
  }
  return b.build()
}

private fun contextOf(c: SeamSpanContext): SpanContext =
  SpanContext.create(c.traceId, c.spanId, TraceFlags.fromByte(c.traceFlags.toInt().toByte()), traceState(c.traceState))

/**
 * A finished JS span handed over the seam: the frozen [ReadableSpan] the native BatchSpanProcessor queues, and the
 * [SpanData] it exports. Everything but the span context is computed lazily, on first access from the export thread.
 */
class JsSpanData(private val span: SeamSpan, private val resource: Resource) : ReadableSpan, SpanData {
  private val context by lazy { contextOf(span.context) }
  private val parent by lazy {
    span.parentSpanId?.let { SpanContext.create(span.context.traceId, it, context.traceFlags, context.traceState) }
      ?: SpanContext.getInvalid()
  }
  // API SpanKind and Java SpanKind share their order (INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER); OTLP's +1 is the exporter's job.
  private val spanKind by lazy { SpanKind.values().getOrElse(span.kind.toInt()) { SpanKind.INTERNAL } }
  private val attrs by lazy { attributesOf(span.attributes) }
  private val eventList by lazy { span.events.map { EventData.create(epochNanos(it.time), it.name, attributesOf(it.attributes)) } }
  private val linkList by lazy { span.links.map { LinkData.create(contextOf(it.context), attributesOf(it.attributes)) } }
  private val statusData by lazy {
    StatusData.create(StatusCode.values().getOrElse(span.status.code.toInt()) { StatusCode.UNSET }, span.status.message.orEmpty())
  }
  private val scope by lazy {
    InstrumentationScopeInfo.builder(span.scope.name)
      .apply { span.scope.version?.let(::setVersion); span.scope.schemaUrl?.let(::setSchemaUrl) }
      .setAttributes(attributesOf(span.scope.attributes))
      .build()
  }

  override fun getName() = span.name
  override fun getKind() = spanKind
  override fun getSpanContext() = context
  override fun getParentSpanContext() = parent
  override fun getStatus() = statusData
  override fun getStartEpochNanos() = epochNanos(span.start)
  override fun getEndEpochNanos() = epochNanos(span.end)
  override fun getAttributes() = attrs
  override fun getEvents() = eventList
  override fun getLinks() = linkList
  override fun hasEnded() = true
  override fun getTotalRecordedEvents() = span.events.size
  override fun getTotalRecordedLinks() = span.links.size
  override fun getTotalAttributeCount() = span.attributes.size
  override fun getInstrumentationScopeInfo() = scope
  @Deprecated("otel-java deprecated API; still abstract on both interfaces")
  override fun getInstrumentationLibraryInfo(): InstrumentationLibraryInfo =
    @Suppress("DEPRECATION") InstrumentationLibraryInfo.create(scope.name, scope.version, scope.schemaUrl)
  override fun getResource() = resource

  // ReadableSpan: frozen, nothing to mutate
  override fun toSpanData(): SpanData = this
  override fun getLatencyNanos() = endEpochNanos - startEpochNanos
  override fun <T : Any?> getAttribute(key: AttributeKey<T>): T? = attrs.get(key)
}
