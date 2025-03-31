package com.opentelemetry

import android.util.Log
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.module.annotations.ReactModule
import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.api.common.Attributes
import io.opentelemetry.api.trace.SpanContext
import io.opentelemetry.api.trace.SpanKind
import io.opentelemetry.api.trace.StatusCode
import io.opentelemetry.api.trace.TraceFlags
import io.opentelemetry.api.trace.TraceState
import io.opentelemetry.sdk.common.InstrumentationLibraryInfo
import io.opentelemetry.sdk.common.InstrumentationScopeInfo
import io.opentelemetry.sdk.metrics.data.AggregationTemporality
import io.opentelemetry.sdk.metrics.data.Data
import io.opentelemetry.sdk.metrics.data.SumData
import io.opentelemetry.sdk.metrics.data.LongExemplarData
import io.opentelemetry.sdk.metrics.data.LongPointData
import io.opentelemetry.sdk.metrics.data.MetricData
import io.opentelemetry.sdk.metrics.data.MetricDataType
import io.opentelemetry.sdk.trace.ReadableSpan
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

    for (i in 0 until spans.size()) {
      val spanMap = spans.getMap(i) ?: continue
      val span = createReadableSpan(spanMap)
      OpenTelemetry.spanProcessor?.onEnd(span)
    }
  }

  private fun createReadableSpan(rawSpan: ReadableMap): ReadableSpan {
    val spanData = createSpanData(rawSpan)

    return object : ReadableSpan {
      override fun getSpanContext() = spanData.spanContext

      override fun getParentSpanContext() = spanData.parentSpanContext

      override fun getName() = spanData.name

      override fun toSpanData() = spanData

      override fun getInstrumentationLibraryInfo() = spanData.instrumentationLibraryInfo

      override fun hasEnded() = spanData.hasEnded()

      override fun getKind() = spanData.kind

      override fun <T> getAttribute(key: AttributeKey<T>) = spanData.attributes.get(key)

      override fun getLatencyNanos() = spanData.endEpochNanos - spanData.startEpochNanos
    }
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

    val metricDataList = ArrayList<MetricData>()

    for (i in 0 until metrics.size()) {
      val metricMap = metrics.getMap(i) ?: continue
      val rawScope = metricMap.getMap("scope") ?: continue
      val rawMetrics = metricMap.getArray("metrics") ?: continue

      for (y in 0 until rawMetrics.size()) {
        val rawMetric = rawMetrics.getMap(i) ?: continue
        val metricData = createMetricData(rawMetric, rawScope)
        metricDataList.add(metricData)
      }
    }

    OpenTelemetry.logMetricExporter?.export(metricDataList)
    OpenTelemetry.otlpMetricExporter?.export(metricDataList)
  }

  private fun createMetricData(rawMetric: ReadableMap, rawScope: ReadableMap): MetricData {
    return object : MetricData {
      override fun getResource() = OpenTelemetry.sdkResource

      override fun getInstrumentationScopeInfo(): InstrumentationScopeInfo {
        val name = rawScope.getString("name") ?: "unknown"
        val builder = InstrumentationScopeInfo.builder(name)
        rawScope.getString("version")?.let { builder.setVersion(it) }
        return builder.build()
      }

      override fun getName(): String {
        val descriptor = rawMetric.getMap("descriptor")
        return descriptor?.getString("name") ?: "unknown"
      }

      override fun getDescription(): String {
        val descriptor = rawMetric.getMap("descriptor")
        return descriptor?.getString("description") ?: ""
      }

      override fun getUnit(): String {
        val descriptor = rawMetric.getMap("descriptor")
        return descriptor?.getString("unit") ?: ""
      }

      override fun getType(): MetricDataType {
        // TODO: look into the `valueType` on the descriptor, we might need to support long/double types properly
        return when (rawMetric.getInt("dataPointType")) {
          0 -> MetricDataType.HISTOGRAM
          1 -> MetricDataType.EXPONENTIAL_HISTOGRAM
          2 -> MetricDataType.LONG_GAUGE
          3 -> MetricDataType.LONG_SUM
          else -> MetricDataType.SUMMARY
        }
      }

      override fun getData(): Data<*> {
        val dataPoints = rawMetric.getArray("dataPoints")
        val isMonotonic = rawMetric.getBoolean("isMonotonic")
        val aggregationTemporality = when (rawMetric.getInt("aggregationTemporality")) {
          0 -> AggregationTemporality.DELTA
          1 -> AggregationTemporality.CUMULATIVE
          else -> AggregationTemporality.CUMULATIVE
        }

        when (type) {
          MetricDataType.HISTOGRAM -> TODO()
          MetricDataType.LONG_GAUGE -> TODO()
          MetricDataType.DOUBLE_GAUGE -> TODO()
          MetricDataType.LONG_SUM -> {
            return object : SumData<LongPointData> {
              override fun getPoints(): MutableCollection<LongPointData> {
                val points = mutableListOf<LongPointData>()
                if (dataPoints == null) return points

                for (i in 0 until dataPoints.size()) {
                  val point = dataPoints.getMap(i) ?: continue
                  points.add(createLongPointData(point))
                }

                return points
              }

              override fun isMonotonic() = isMonotonic

              override fun getAggregationTemporality() = aggregationTemporality
            }
          }
          MetricDataType.DOUBLE_SUM -> TODO()
          MetricDataType.SUMMARY -> TODO()
          MetricDataType.EXPONENTIAL_HISTOGRAM -> TODO()
        }
      }
    }
  }

  private fun createLongPointData(point: ReadableMap): LongPointData {
    return object : LongPointData {
      override fun getValue(): Long {
        return point.getDouble("value").toLong()
      }

      override fun getAttributes(): Attributes {
        val attributes = point.getMap("attributes")
        return attributes?.toOpenTelemetryAttributes() ?: Attributes.empty()
      }

      override fun getStartEpochNanos(): Long {
        val startTime = point.getArray("startTime") ?: return 0
        return startTime.hrTimeToNanoseconds()
      }

      override fun getEpochNanos(): Long {
        val endTime = point.getArray("endTime") ?: return 0
        return endTime.hrTimeToNanoseconds()
      }

      // Implement any other required methods from LongPointData
      override fun getExemplars(): List<LongExemplarData> {
        // Return empty list if you don't have exemplars
        return emptyList()
      }
    }
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