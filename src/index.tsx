import * as api from "@opentelemetry/api";
import { Resource } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import type { Options } from "./NativeOpenTelemetry";
import { NativeTraceExporter } from "./native-trace-exporter";
import { NativeMetricExporter } from "./native-metric-exporter";

export function observability(options: Options = {}) {
  console.log("SDK", { options });

  const resource = new Resource({
    [ATTR_SERVICE_NAME]: options.name,
    [ATTR_SERVICE_VERSION]: options.version,
    environment: options.environment,
  });

  // Metrics
  const nativeMetricReader = new PeriodicExportingMetricReader({
    exporter: new NativeMetricExporter(),
  });

  const meterProvider = new MeterProvider({
    resource,
    readers: [nativeMetricReader],
  });

  api.metrics.setGlobalMeterProvider(meterProvider);

  // Traces
  const nativeSpanProcessor = new BatchSpanProcessor(new NativeTraceExporter());
  const tracerProvider = new BasicTracerProvider({
    resource,
    spanProcessors: [nativeSpanProcessor],
  });

  api.trace.setGlobalTracerProvider(tracerProvider);

  return api;
}
