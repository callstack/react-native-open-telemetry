package com.callstack.otel.core

import com.margelo.nitro.callstack.otel.AttrValue
import com.margelo.nitro.callstack.otel.SeamAttribute
import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.api.common.Attributes

// Number.isInteger(v): whole and finite (-0 included). Long.MAX_VALUE as Double is 2^63, hence the exclusive bound.
private fun isLong(v: Double) = v == Math.rint(v) && v >= -9.223372036854775807E18 && v < 9.223372036854775807E18

/** JS numbers become `long` iff Number.isInteger (and they fit), else `double`; the same rule on JS, Kotlin, Swift. */
fun attributesOf(list: Array<SeamAttribute>): Attributes {
  val b = Attributes.builder()
  for (a in list) {
    val k = a.key
    when (val v = a.value) {
      is AttrValue.Fifth -> b.put(k, v.value)
      is AttrValue.First -> b.put(k, v.value)
      is AttrValue.Sixth -> if (isLong(v.value)) b.put(k, v.value.toLong()) else b.put(k, v.value)
      is AttrValue.Third -> b.put(AttributeKey.stringArrayKey(k), v.value.toList())
      is AttrValue.Second -> b.put(AttributeKey.booleanArrayKey(k), v.value.toList())
      is AttrValue.Fourth ->
        if (v.value.all(::isLong)) b.put(AttributeKey.longArrayKey(k), v.value.map { it.toLong() })
        else b.put(AttributeKey.doubleArrayKey(k), v.value.toList())
    }
  }
  return b.build()
}

/** An `HrTime` `[seconds, nanos]` as epoch nanos. Never throws on the JS thread: missing elements read as 0. */
fun epochNanos(t: DoubleArray): Long = t.getOrElse(0) { 0.0 }.toLong() * 1_000_000_000L + t.getOrElse(1) { 0.0 }.toLong()
