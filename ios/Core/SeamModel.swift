import Foundation

// Mirrors the Nitro seam (src/native/Otel.nitro.ts) without Nitro types; the iOS adapter converts.
// `Core` prefix: ios/Core and the generated Seam* structs share one module in the pod.

/// OTel HrTime `[seconds, nanos]`.
struct HrTime {
  let seconds: Double
  let nanos: Double

  /// Never traps on the JS thread: missing elements read as 0 (C4).
  init(_ a: [Double]) {
    seconds = a.count > 0 ? a[0] : 0
    nanos = a.count > 1 ? a[1] : 0
  }

  /// R22: `Date` holds a Double of seconds, so whole µs come back on a ~256 ns grid (verify/VERIFY.md).
  var date: Date { Date(timeIntervalSince1970: seconds + nanos / 1e9) }
}

enum CoreValue {
  case string(String)
  case bool(Bool)
  case number(Double)
  case strings([String])
  case bools([Bool])
  case numbers([Double])
}

struct CoreAttribute {
  let key: String
  let value: CoreValue
}

struct CoreSpanContext {
  let traceId: String
  let spanId: String
  let traceFlags: Int
  var traceState: String? = nil
}

struct CoreEvent {
  let name: String
  let time: HrTime
  let attributes: [CoreAttribute]
}

struct CoreLink {
  let context: CoreSpanContext
  let attributes: [CoreAttribute]
}

struct CoreScope {
  let name: String
  let version: String?
  let schemaUrl: String?
  let attributes: [CoreAttribute]
}

struct CoreStatus {
  let code: Int
  let message: String?
}

struct CoreSpan {
  let context: CoreSpanContext
  let parentSpanId: String?
  let name: String
  /// `@opentelemetry/api` SpanKind (INTERNAL = 0).
  let kind: Int
  let start: HrTime
  let end: HrTime
  let attributes: [CoreAttribute]
  let events: [CoreEvent]
  let links: [CoreLink]
  let status: CoreStatus
  let scope: CoreScope
}
