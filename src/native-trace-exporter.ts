import type { ExportResult } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import NATIVE from "./NativeOpenTelemetry";

export class NativeTraceExporter implements SpanExporter {
  export(spans: ReadableSpan[], callback: (result: ExportResult) => void) {
    console.log("Offloading traces to the native SDK");
    NATIVE.exportTraces(
      spans.map(span => ({
        name: span.name,
        kind: span.kind,
        status: span.status,
        attributes: span.attributes,
        spanContext: span.spanContext(),
        parentSpanId: span.parentSpanContext?.spanId,
        startTime: span.startTime,
        endTime: span.endTime,
        ended: span.ended,
        instrumentationScope: span.instrumentationScope,
      }))
    );
    callback({ code: 0 });
  }

  forceFlush() {
    return Promise.resolve();
  }

  shutdown() {
    return Promise.resolve();
  }
}
