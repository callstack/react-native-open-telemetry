import Foundation
import OpenTelemetryApi

private let traceparentRegex = try! NSRegularExpression(pattern: "^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")

func contextFrom(traceparent: String) -> SpanContext? {
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
