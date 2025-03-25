package com.opentelemetry

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import io.opentelemetry.api.common.Attributes
import io.opentelemetry.api.trace.SpanContext
import io.opentelemetry.api.trace.SpanKind
import io.opentelemetry.api.trace.StatusCode
import io.opentelemetry.api.trace.TraceFlags
import io.opentelemetry.api.trace.TraceState
import io.opentelemetry.sdk.common.InstrumentationLibraryInfo
import io.opentelemetry.sdk.common.InstrumentationScopeInfo
import io.opentelemetry.sdk.trace.data.EventData
import io.opentelemetry.sdk.trace.data.LinkData
import io.opentelemetry.sdk.trace.data.SpanData
import io.opentelemetry.sdk.trace.data.StatusData

@ReactModule(name = OpenTelemetryModule.NAME)
class OpenTelemetryModule(reactContext: ReactApplicationContext) :
  NativeOpenTelemetrySpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun exportTraces(spans: ReadableArray) {
    Log.d(NAME, "Spans size: ${spans.size()}")

    val spanDataList = ArrayList<SpanData>()

    for (i in 0 until spans.size()) {
      val spanMap = spans.getMap(i) ?: continue
      val spanData = createSpanData(spanMap)
      spanDataList.add(spanData)
    }

    OpenTelemetry.logSpanExporter?.export(spanDataList)
    OpenTelemetry.otlpSpanExporter?.export(spanDataList)
  }

  private fun createSpanData(rawSpan: ReadableMap): SpanData {
    return object : SpanData {
      override fun getName() = rawSpan.getString("name") ?: "unknown"

      override fun getResource() = OpenTelemetry.sdkResource

      override fun getKind(): SpanKind {
        return rawSpan.getDouble("kind").let { SpanKind.entries.getOrNull(it.toInt()) }
          ?: SpanKind.INTERNAL
      }

      override fun getSpanContext(): SpanContext {
        val ctx = rawSpan.getMap("spanContext")
        return SpanContext.create(
          ctx?.getString("traceId"),
          ctx?.getString("spanId"),
          TraceFlags.fromByte(ctx?.getInt("traceFlags")!!.toByte()),
          TraceState.getDefault()
        )
      }

      override fun getParentSpanContext(): SpanContext {
        val ctx = rawSpan.getMap("spanContext")
        return SpanContext.create(
          ctx?.getString("traceId"),
          rawSpan.getString("parentSpanId"),
          TraceFlags.fromByte(ctx?.getInt("traceFlags")!!.toByte()),
          TraceState.getDefault()
        )
      }

      override fun getParentSpanId() = rawSpan.getString("parentSpanId") ?: ""

      override fun getStatus(): StatusData {
        val status = rawSpan.getMap("status")
        val code =
          status?.getDouble("code")?.let { StatusCode.entries.getOrNull(it.toInt()) }
            ?: StatusCode.UNSET
        val description = status?.getString("description")
        return StatusData.create(code, description)
      }

      override fun getStartEpochNanos(): Long {
        val startTime = rawSpan.getArray("startTime") ?: return 0
        return startTime.hrTimeToNanoseconds()
      }

      override fun getAttributes(): Attributes {
        val attributes = rawSpan.getMap("attributes") ?: return Attributes.empty()
        return attributes.toOpenTelemetryAttributes()
      }

      // TODO
      override fun getEvents(): MutableList<EventData> {
        return mutableListOf()
      }

      // TODO
      override fun getLinks(): MutableList<LinkData> {
        return mutableListOf()
      }

      override fun getEndEpochNanos(): Long {
        val endTime = rawSpan.getArray("endTime") ?: return 0
        return endTime.hrTimeToNanoseconds()
      }

      override fun hasEnded() = rawSpan.getBoolean("ended")

      // TODO
      override fun getTotalRecordedEvents() = 0

      // TODO
      override fun getTotalRecordedLinks() = 0

      override fun getTotalAttributeCount() = getAttributes().size()

      override fun getInstrumentationScopeInfo(): InstrumentationScopeInfo {
        val instrumentation = rawSpan.getMap("instrumentationLibrary")
        val name = instrumentation?.getString("name") ?: "unknown"
        val builder = InstrumentationScopeInfo.builder(name)
        instrumentation?.getString("version")?.let { builder.setSchemaUrl(it) }
        instrumentation?.getString("schemaUrl")?.let { builder.setSchemaUrl(it) }
        return builder.build()
      }

      override fun getInstrumentationLibraryInfo(): InstrumentationLibraryInfo {
        val instrumentation = rawSpan.getMap("instrumentationLibrary")
        val name = instrumentation?.getString("name") ?: "unknown"
        val version = instrumentation?.getString("version") ?: "unknown"
        return InstrumentationLibraryInfo.create(name, version)
      }
    }
  }

  override fun exportMetrics(metrics: ReadableArray) {
      Log.d(NAME, "Metrics size: ${metrics.size()}")
  }

  companion object {
    const val NAME = "OpenTelemetry"
  }
}

fun ReadableMap.toOpenTelemetryAttributes(): Attributes {
  val builder = Attributes.builder()
  val iterator = this.keySetIterator()

  while (iterator.hasNextKey()) {
    val key = iterator.nextKey()
    when (val type = this.getType(key)) {
      ReadableType.String -> builder.put(key, this.getString(key) ?: "")
      ReadableType.Number -> builder.put(key, this.getDouble(key))
      else -> TODO("Unsupported attribute type: $type")
    }
  }

  return builder.build()
}

// Converts HrTime [seconds, nanoseconds] to total nanoseconds
fun ReadableArray.hrTimeToNanoseconds(): Long {
  if (this.size() != 2) return 0L

  val seconds = this.getDouble(0).toLong()
  val nanos = this.getDouble(1).toLong()
  return seconds * 1_000_000_000 + nanos
}