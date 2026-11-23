package com.callstack.otel.core

import io.opentelemetry.exporter.otlp.http.trace.OtlpHttpSpanExporter
import io.opentelemetry.sdk.resources.Resource
import io.opentelemetry.sdk.trace.IdGenerator
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

// ponytail: minimal config for Task 15 (R12); Task 16 adds tracesUrl, headers, distro attributes and URL validation.
data class CoreConfig(
  val serviceName: String,
  val serviceVersion: String? = null,
  val resourceAttributes: List<SeamAttribute> = emptyList(),
  /** Base URL; `/v1/traces` is appended. */
  val exportUrl: String,
)

/** Test mode: `0b…` IDs, the native counterpart of JS `sequentialIds('0a')`. */
private class SequentialIds : IdGenerator {
  private val t = AtomicLong()
  private val s = AtomicLong()
  override fun generateTraceId() = "0b" + t.incrementAndGet().toString().padStart(30, '0')
  override fun generateSpanId() = "0b" + s.incrementAndGet().toString().padStart(14, '0')
}

class OtelCore(config: CoreConfig, testMode: Boolean = false) {
  /** The one resource of the app; in test mode built from config only (no `telemetry.*`). */
  val resource: Resource = (if (testMode) Resource.empty() else Resource.getDefault()).merge(
    Resource.create(
      attributesOf(config.resourceAttributes).toBuilder()
        .put("service.name", config.serviceName)
        .apply { config.serviceVersion?.let { put("service.version", it) } }
        .build(),
    ),
  )

  private val bsp = BatchSpanProcessor.builder(
    OtlpHttpSpanExporter.builder().setEndpoint(config.exportUrl.trimEnd('/') + "/v1/traces").build(),
  ).build()

  /** The native TracerProvider; JS spans join its batch processor. */
  val tracerProvider: SdkTracerProvider = SdkTracerProvider.builder()
    .setResource(resource)
    .addSpanProcessor(bsp)
    .apply { if (testMode) setIdGenerator(SequentialIds()) }
    .build()

  /** JS-thread work: wrap and enqueue only; SpanData is built on the export thread. */
  fun handOff(spans: List<SeamSpan>) {
    for (s in spans) bsp.onEnd(JsSpanData(s, resource))
  }

  fun flush(timeoutMs: Long): Boolean = tracerProvider.forceFlush().join(timeoutMs, TimeUnit.MILLISECONDS).isSuccess
}
