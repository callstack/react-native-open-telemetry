package com.opentelemetry

import android.content.Context
import io.opentelemetry.api.GlobalOpenTelemetry
import io.opentelemetry.api.OpenTelemetry
import io.opentelemetry.api.common.AttributeKey
import io.opentelemetry.api.common.Attributes
import io.opentelemetry.exporter.logging.LoggingMetricExporter
import io.opentelemetry.exporter.logging.LoggingSpanExporter
import io.opentelemetry.exporter.otlp.metrics.OtlpGrpcMetricExporter
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter
import io.opentelemetry.sdk.OpenTelemetrySdk
import io.opentelemetry.sdk.metrics.SdkMeterProvider
import io.opentelemetry.sdk.metrics.export.MetricExporter
import io.opentelemetry.sdk.metrics.export.PeriodicMetricReader
import io.opentelemetry.sdk.resources.Resource
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor
import io.opentelemetry.sdk.trace.export.SpanExporter

class OpenTelemetry {
    companion object {
        var sdkResource: Resource = Resource.getDefault()
        var logSpanExporter: SpanExporter? = null
        var logMetricExporter: MetricExporter? = null
        var otlpSpanExporter: OtlpGrpcSpanExporter? = null
        var otlpMetricExporter: OtlpGrpcMetricExporter? = null

        fun get(): OpenTelemetry = GlobalOpenTelemetry.get()

        fun init(context: Context, configurationOptions: (Options.() -> Unit)? = null) {
            val options = Options()

            configurationOptions?.let { options.apply(it) }

            sdkResource = sdkResource.merge(
                Resource.create(
                    Attributes.of(
                        AttributeKey.stringKey("service.name"),
                        options.name,
                        AttributeKey.stringKey("service.version"),
                        options.version,
                        AttributeKey.stringKey("environment"),
                        options.environment
                    ),
                ),
            )

            if (options.debug) {
                logSpanExporter = LoggingSpanExporter.create()
                logMetricExporter = LoggingMetricExporter.create()
            }

            otlpSpanExporter =
                options.url?.let { OtlpGrpcSpanExporter.builder().setEndpoint(it).build() }
            otlpMetricExporter =
                options.url?.let { OtlpGrpcMetricExporter.builder().setEndpoint(it).build() }

            val logSpanProcessor = logSpanExporter?.let { BatchSpanProcessor.builder(it).build() }
            val logMetricReader = logMetricExporter?.let { PeriodicMetricReader.create(it) }

            val otlpSpanProcessor = otlpSpanExporter?.let { BatchSpanProcessor.builder(it).build() }
            val otlpMetricReader = otlpMetricExporter?.let { PeriodicMetricReader.create(it) }

            val tracerProviderBuilder = SdkTracerProvider.builder()
            tracerProviderBuilder.setResource(sdkResource)
            logSpanProcessor?.let { tracerProviderBuilder.addSpanProcessor(it) }
            otlpSpanProcessor?.let { tracerProviderBuilder.addSpanProcessor(it) }
            val tracerProvider = tracerProviderBuilder.build()

            val meterProviderBuilder = SdkMeterProvider.builder()
            meterProviderBuilder.setResource(sdkResource)
            logMetricReader?.let { meterProviderBuilder.registerMetricReader(it) }
            otlpMetricReader?.let { meterProviderBuilder.registerMetricReader(it) }
            val meterProvider = meterProviderBuilder.build()

            // TODO: remove and only allow a single call to `init()`
            GlobalOpenTelemetry.resetForTest()

            OpenTelemetrySdk.builder()
                .setTracerProvider(tracerProvider)
                .setMeterProvider(meterProvider)
                .buildAndRegisterGlobal()
        }
    }
}
