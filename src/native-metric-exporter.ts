import type { PushMetricExporter } from "@opentelemetry/sdk-metrics";

/* Noop implementation for Web */
export class NativeMetricExporter implements PushMetricExporter {
  export() {}

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
