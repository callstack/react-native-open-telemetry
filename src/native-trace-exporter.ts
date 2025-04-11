import type { SpanExporter } from "@opentelemetry/sdk-trace-base";

/* Noop implementation for Web */
export class NativeTraceExporter implements SpanExporter {
  export() {}

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
