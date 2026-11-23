import OpenTelemetryApi
import OpenTelemetryProtocolExporterCommon
import OpenTelemetrySdk
import XCTest
@testable import OtelCore

/// R22/F8: opentelemetry-swift keeps times as `Date` and exports `UInt64(timeIntervalSince1970 * 1e9)`, so
/// whole-µs seam times cannot come back exact. This documents the floor; the drafted `ios` files record the
/// quantized values as emitted.
final class TimeRoundTripTests: XCTestCase {
  private let base: UInt64 = 1_767_225_600_000_000_000
  private func at(_ us: UInt64) -> HrTime { HrTime([Double(1_767_225_600 + us / 1_000_000), Double(us % 1_000_000 * 1000)]) }

  private func exported(_ t: HrTime) -> UInt64 {
    let span = CoreSpan(context: CoreSpanContext(traceId: "0a000000000000000000000000000001", spanId: "0a00000000000001", traceFlags: 1),
                        parentSpanId: nil, name: "t", kind: 0, start: t, end: t, attributes: [], events: [], links: [],
                        status: CoreStatus(code: 0, message: nil), scope: CoreScope(name: "t", version: nil, schemaUrl: nil, attributes: []))
    return SpanAdapter.toProtoSpan(spanData: JsReadableSpan(span, resource: Resource(attributes: [:])).toSpanData()).startTimeUnixNano
  }

  func testWholeMicrosecondsQuantizeWithinTheDateFloor() {
    var maxErr: Int64 = 0
    var exact = 0
    let samples = Array(0 ... 10_000) + [1_000_000_000]
    for us in samples {
      let want = base + UInt64(us) * 1000
      let got = exported(at(UInt64(us)))
      let err = Int64(bitPattern: got &- want)
      maxErr = max(maxErr, abs(err))
      if err == 0 { exact += 1 }
    }
    print("TimeRoundTrip: max |error| \(maxErr) ns, \(exact)/\(samples.count) exact")
    // the exported value is a double near 1.77e18, whose grid is 256 ns
    XCTAssertLessThanOrEqual(maxErr, 256)
    XCTAssertLessThan(exact, samples.count, "times came back exact: R22 no longer holds, revisit the floor in VERIFY.md")
  }
}
