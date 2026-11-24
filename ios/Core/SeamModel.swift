import Foundation

// Mirrors the Nitro seam (src/native/Otel.nitro.ts) without Nitro types; the iOS adapter converts.
// `package` access: the adapter pod (ReactNativeOpenTelemetry, Nitro) builds these across modules (R24); apps never see
// them. Swift synthesizes only internal memberwise initializers, hence the explicit ones.

/// OTel HrTime `[seconds, nanos]`.
package struct HrTime {
  let seconds: Double
  let nanos: Double

  /// Never traps on the JS thread: missing elements read as 0 (C4).
  package init(_ a: [Double]) {
    seconds = a.count > 0 ? a[0] : 0
    nanos = a.count > 1 ? a[1] : 0
  }

  /// R22: `Date` holds a Double of seconds, so whole µs come back on a ~256 ns grid (verify/VERIFY.md).
  var date: Date { Date(timeIntervalSince1970: seconds + nanos / 1e9) }
}

package enum CoreValue {
  case string(String)
  case bool(Bool)
  case number(Double)
  case strings([String])
  case bools([Bool])
  case numbers([Double])
}

package struct CoreAttribute {
  let key: String
  let value: CoreValue
  package init(key: String, value: CoreValue) { self.key = key; self.value = value }
}

package struct CoreSpanContext {
  let traceId: String
  let spanId: String
  let traceFlags: Int
  var traceState: String? = nil
  package init(traceId: String, spanId: String, traceFlags: Int, traceState: String? = nil) {
    self.traceId = traceId; self.spanId = spanId; self.traceFlags = traceFlags; self.traceState = traceState
  }
}

package struct CoreEvent {
  let name: String
  let time: HrTime
  let attributes: [CoreAttribute]
  package init(name: String, time: HrTime, attributes: [CoreAttribute]) {
    self.name = name; self.time = time; self.attributes = attributes
  }
}

package struct CoreLink {
  let context: CoreSpanContext
  let attributes: [CoreAttribute]
  package init(context: CoreSpanContext, attributes: [CoreAttribute]) { self.context = context; self.attributes = attributes }
}

package struct CoreScope {
  let name: String
  let version: String?
  let schemaUrl: String?
  let attributes: [CoreAttribute]
  package init(name: String, version: String?, schemaUrl: String?, attributes: [CoreAttribute]) {
    self.name = name; self.version = version; self.schemaUrl = schemaUrl; self.attributes = attributes
  }
}

package struct CoreStatus {
  let code: Int
  let message: String?
  package init(code: Int, message: String?) { self.code = code; self.message = message }
}

package struct CoreSpan {
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
  package init(context: CoreSpanContext, parentSpanId: String?, name: String, kind: Int, start: HrTime, end: HrTime,
               attributes: [CoreAttribute], events: [CoreEvent], links: [CoreLink], status: CoreStatus, scope: CoreScope) {
    self.context = context; self.parentSpanId = parentSpanId; self.name = name; self.kind = kind; self.start = start
    self.end = end; self.attributes = attributes; self.events = events; self.links = links; self.status = status
    self.scope = scope
  }
}
