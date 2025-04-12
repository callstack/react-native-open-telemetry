import type { ExportResult } from "@opentelemetry/core";
import type {
  PushMetricExporter,
  ResourceMetrics,
} from "@opentelemetry/sdk-metrics";
import NATIVE from "./NativeOpenTelemetry";

export class NativeMetricExporter implements PushMetricExporter {
  export(entry: ResourceMetrics, callback: (result: ExportResult) => void) {
    console.log("Offloading metrics to the native SDK");
    NATIVE.exportMetrics(entry.scopeMetrics);
    callback({ code: 0 });
  }

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
