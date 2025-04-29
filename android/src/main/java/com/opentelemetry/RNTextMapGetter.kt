package com.opentelemetry

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import io.opentelemetry.context.propagation.TextMapGetter

object RNTextMapGetter : TextMapGetter<ReadableMap> {
    override fun keys(carrier: ReadableMap): MutableIterable<String> {
        val iterator: ReadableMapKeySetIterator = carrier.keySetIterator()
        val keys = mutableListOf<String>()
        while (iterator.hasNextKey()) {
            keys.add(iterator.nextKey())
        }
        return keys
    }

    override fun get(carrier: ReadableMap?, key: String): String? {
        return carrier?.getString(key)
    }
}