package com.callstack.otel.core

import com.margelo.nitro.callstack.otel.AttrValue
import com.margelo.nitro.callstack.otel.SeamAttribute
import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.api.common.Attributes

private fun isLong(v: Double) = v == Math.rint(v) && v >= -9.223372036854775807E18 && v < 9.223372036854775807E18

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

fun epochNanos(t: DoubleArray): Long = t.getOrElse(0) { 0.0 }.toLong() * 1_000_000_000L + t.getOrElse(1) { 0.0 }.toLong()
