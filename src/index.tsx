import { Platform } from "react-native";
import * as api from "@opentelemetry/api";
import {
  defaultResource,
  resourceFromAttributes,
} from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-metrics";
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { Options } from "./types";
import { NativeTraceExporter } from "./native-trace-exporter";
import { NativeMetricExporter } from "./native-metric-exporter";

export function openTelemetrySDK(options: Options = {}) {
  console.log("SDK", { options });

  // Resource

  const resource = defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: options.name,
      [ATTR_SERVICE_VERSION]: options.version,
      "deployment.environment.name":
        options.environment ?? process.env.NODE_ENV, // ATTR_DEPLOYMENT_ENVIRONMENT_NAME
      "os.name": Platform.OS, // ATTR_OS_NAME
      "os.version": Platform.Version, // ATTR_OS_VERSION
    })
  );

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
          url: `${options.url}/v1/traces`,
          headers: {
            "Content-Type": "application/json",
          },
        })
      )
    : null;

  const tracerProvider = new WebTracerProvider({
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
          url: `${options.url}/v1/metrics`,
          headers: {
            "Content-Type": "application/json",
          },
        }),
      })
    : null;

  const meterProvider = new MeterProvider({
    resource,
    readers: [logMetricReader, nativeMetricReader, otlpMetricReader].filter(
      (reader) => reader !== null
    ),
  });

  // Globals

  api.metrics.setGlobalMeterProvider(meterProvider);
  api.trace.setGlobalTracerProvider(tracerProvider);

  return api;
}
