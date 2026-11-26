package com.callstack.otel.core

import com.margelo.nitro.callstack.otel.SeamSpan
import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter
import io.opentelemetry.sdk.common.CompletableResultCode
import io.opentelemetry.sdk.trace.data.SpanData
import io.opentelemetry.sdk.trace.export.SpanExporter
import io.opentelemetry.sdk.resources.Resource
import io.opentelemetry.sdk.trace.IdGenerator
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

private class SequentialIds : IdGenerator {
  private val t = AtomicLong()
  private val s = AtomicLong()
  override fun generateTraceId() = "0b" + t.incrementAndGet().toString().padStart(30, '0')
  override fun generateSpanId() = "0b" + s.incrementAndGet().toString().padStart(14, '0')
}

const val DISTRO_NAME = "react-native-open-telemetry"

private class LazyExporter(private val build: () -> SpanExporter) : SpanExporter {
  private val d by lazy(build)
  override fun export(spans: Collection<SpanData>) = d.export(spans)
  override fun flush(): CompletableResultCode = d.flush()
  override fun shutdown(): CompletableResultCode = d.shutdown()
}

class OtelCore(config: CoreConfig, testMode: Boolean = false, distroVersion: String = "unknown") {
  val resource: Resource = (if (testMode) Resource.empty() else Resource.getDefault()).merge(
    Resource.create(
      config.resourceAttributes.toBuilder()
        .put("service.name", config.serviceName)
        .apply { config.serviceVersion?.let { put("service.version", it) } }
        .apply {
          if (!testMode) {
            put("telemetry.distro.name", DISTRO_NAME)
            put("telemetry.distro.version", distroVersion)
          }
        }
        .build(),
    ),
  )

  private val bsp = BatchSpanProcessor.builder(
    LazyExporter {
      OtlpHttpSpanExporter.builder().setEndpoint(config.exportUrl)
        .apply { config.exportHeaders.forEach { (k, v) -> addHeader(k, v) } }.build()
    },
  ).apply { if (testMode) setScheduleDelay(120, TimeUnit.SECONDS) }.build()

  val tracerProvider: SdkTracerProvider = SdkTracerProvider.builder()
    .setResource(resource)
    .addSpanProcessor(bsp)
    .apply { if (testMode) setIdGenerator(SequentialIds()) }
    .build()

  fun handOff(spans: Array<SeamSpan>) {
    for (s in spans) bsp.onEnd(JsSpanData(s, resource))
  }

  fun flush(timeoutMs: Long): Boolean = tracerProvider.forceFlush().join(timeoutMs, TimeUnit.MILLISECONDS).isSuccess

  companion object {
    private var state: InitResult? = null
    @Volatile var instance: OtelCore? = null
      private set

    @Synchronized fun initialize(config: CoreConfig?, testMode: Boolean = false, distroVersion: String = "unknown"): InitResult {
      state?.let { return it.copy(alreadyInitialized = true) }
      if (config == null) return InitResult(false, testMode, "not initialized: no config")
      val err = validateExportUrl(config.exportUrl)
      val result = InitResult(false, testMode, err)
      if (err == null) {
        try { instance = OtelCore(config, testMode, distroVersion) } catch (e: Exception) {
          return InitResult(false, testMode, "init failed: ${e.message}").also { state = it }
        }
      }
      state = result
      return result
    }

    @Synchronized internal fun resetForTest() { state = null; instance = null }
  }
}
