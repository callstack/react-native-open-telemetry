package com.callstack.otel.core

import io.opentelemetry.api.trace.Span
import io.opentelemetry.api.trace.SpanContext
import io.opentelemetry.api.trace.TraceFlags
import io.opentelemetry.api.trace.TraceState
import io.opentelemetry.context.Context

private val TRACEPARENT = Regex("^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")

fun contextFrom(traceparent: String): Context {
  val m = TRACEPARENT.matchEntire(traceparent) ?: return Context.root()
  val (traceId, spanId, flags) = m.destructured
  val sc = SpanContext.create(traceId, spanId, TraceFlags.fromHex(flags, 0), TraceState.getDefault())
  return if (sc.isValid) Context.root().with(Span.wrap(sc)) else Context.root()
}

fun traceparentOf(span: Span): String =
  span.spanContext.let { "00-${it.traceId}-${it.spanId}-${it.traceFlags.asHex()}" }
