import * as api from "@opentelemetry/api";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { Options } from "./NativeOpenTelemetry";
import { NativeTraceExporter } from "./native-trace-exporter";
import { NativeMetricExporter } from "./native-metric-exporter";

export function openTelemetrySDK(options: Options = {}) {
  console.log("SDK", { options });

  // Resource

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: options.name,
    [ATTR_SERVICE_VERSION]: options.version,
    environment: options.environment,
  });

  // Traces

    const logSpanProcessor = options.debug
      ? new BatchSpanProcessor(new ConsoleSpanExporter())
      : null;
    const nativeSpanProcessor = options.native
      ? new BatchSpanProcessor(new NativeTraceExporter())
      : null;
    const otlpSpanProcessor = options.url
      ? new BatchSpanProcessor(
          new OTLPTraceExporter({
            url: options.url,
            headers: {
              "Content-Type": "application/json",
            },
          })
        )
      : null;

    const tracerProvider = new BasicTracerProvider({
      resource,
      spanProcessors: [
        logSpanProcessor,
        otlpSpanProcessor,
        nativeSpanProcessor,
      ].filter((processor) => processor !== null),
    });

  // Metrics

  const logMetricReader = options.debug
    ? new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
      })
    : null;
  const nativeMetricReader = options.native
    ? new PeriodicExportingMetricReader({
        exporter: new NativeMetricExporter(),
      })
    : null;
  const otlpMetricReader = options.url
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: options.url,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      })
    : null;

  const meterProvider = new MeterProvider({
    resource,
    readers: [logMetricReader, otlpMetricReader, nativeMetricReader].filter(
      (reader) => reader !== null
    ),
  });

  // Globals

  api.metrics.setGlobalMeterProvider(meterProvider);
  api.trace.setGlobalTracerProvider(tracerProvider);

  return api;
}
