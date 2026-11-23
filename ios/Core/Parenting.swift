import Foundation
import OpenTelemetryApi

private let traceparentRegex = try! NSRegularExpression(pattern: "^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")

/// W3C traceparent -> a NON-remote parent `SpanContext` (spec §4.3). In opentelemetry-swift the explicit parent is a
/// `SpanContext`: pass it to `SpanBuilder.setParent(_:)`; nil means "no parent" (`setNoParent()`), i.e. a root.
/// Not W3CTraceContextPropagator.extract: that yields isRemote=true. Invalid input (incl. all-zero ids) -> nil; never throws.
func contextFrom(traceparent: String) -> SpanContext? {
  // `$` matches before a trailing newline, so match the whole string explicitly.
  let range = NSRange(traceparent.startIndex..., in: traceparent)
  guard let m = traceparentRegex.firstMatch(in: traceparent, range: range), m.range == range,
        let t = Range(m.range(at: 1), in: traceparent), let s = Range(m.range(at: 2), in: traceparent),
        let f = Range(m.range(at: 3), in: traceparent) else { return nil }
  let sc = SpanContext.create(traceId: TraceId(fromHexString: String(traceparent[t])),
                              spanId: SpanId(fromHexString: String(traceparent[s])),
                              traceFlags: TraceFlags(fromHexString: String(traceparent[f])),
                              traceState: TraceState())
  return sc.isValid ? sc : nil
}

func traceparent(of c: SpanContext) -> String {
  "00-\(c.traceId.hexString)-\(c.spanId.hexString)-\(c.traceFlags.hexString)"
}
