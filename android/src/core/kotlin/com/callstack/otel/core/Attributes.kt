package com.callstack.otel.core

import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.api.common.Attributes

// Number.isInteger(v): whole and finite (-0 included). Long.MAX_VALUE as Double is 2^63, hence the exclusive bound.
private fun isLong(v: Double) = v == Math.rint(v) && v >= -9.223372036854775807E18 && v < 9.223372036854775807E18

/** JS numbers become `long` iff Number.isInteger (and they fit), else `double`; the same rule on JS, Kotlin, Swift. */
fun attributesOf(list: List<SeamAttribute>): Attributes {
  val b = Attributes.builder()
  for ((k, v) in list) {
    when (v) {
      is AttrValue.Str -> b.put(k, v.value)
      is AttrValue.Bool -> b.put(k, v.value)
      is AttrValue.Num -> if (isLong(v.value)) b.put(k, v.value.toLong()) else b.put(k, v.value)
      is AttrValue.Strs -> b.put(AttributeKey.stringArrayKey(k), v.value)
      is AttrValue.Bools -> b.put(AttributeKey.booleanArrayKey(k), v.value)
      is AttrValue.Nums ->
        if (v.value.all(::isLong)) b.put(AttributeKey.longArrayKey(k), v.value.map { it.toLong() })
        else b.put(AttributeKey.doubleArrayKey(k), v.value)
    }
  }
  return b.build()
}
