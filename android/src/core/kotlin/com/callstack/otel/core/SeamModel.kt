package com.callstack.otel.core

// Mirrors the Nitro seam (src/native/Otel.nitro.ts) without Nitro types; the Android adapter converts.

/** OTel HrTime `[seconds, nanos]`. */
data class HrTime(val seconds: Double, val nanos: Double) {
  val epochNanos: Long get() = seconds.toLong() * 1_000_000_000L + nanos.toLong()

  companion object {
    /** Never throws on the JS thread: missing elements read as 0. */
    fun of(a: DoubleArray) = HrTime(a.getOrElse(0) { 0.0 }, a.getOrElse(1) { 0.0 })
  }
}

sealed class AttrValue {
  data class Str(val value: String) : AttrValue()
  data class Bool(val value: Boolean) : AttrValue()
  data class Num(val value: Double) : AttrValue()
  data class Strs(val value: List<String>) : AttrValue()
  data class Bools(val value: List<Boolean>) : AttrValue()
  data class Nums(val value: List<Double>) : AttrValue()
}

data class SeamAttribute(val key: String, val value: AttrValue)
data class SeamSpanContext(val traceId: String, val spanId: String, val traceFlags: Int, val traceState: String? = null)
data class SeamEvent(val name: String, val time: HrTime, val attributes: List<SeamAttribute>)
data class SeamLink(val context: SeamSpanContext, val attributes: List<SeamAttribute>)
data class SeamScope(val name: String, val version: String?, val schemaUrl: String?, val attributes: List<SeamAttribute>)
data class SeamStatus(val code: Int, val message: String?)

data class SeamSpan(
  val context: SeamSpanContext,
  val parentSpanId: String?,
  val name: String,
  /** `@opentelemetry/api` SpanKind (INTERNAL = 0). */
  val kind: Int,
  val start: HrTime,
  val end: HrTime,
  val attributes: List<SeamAttribute>,
  val events: List<SeamEvent>,
  val links: List<SeamLink>,
  val status: SeamStatus,
  val scope: SeamScope,
)
