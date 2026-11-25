import XCTest
import OpenTelemetryApi
import OpenTelemetrySdk
@testable import OtelCore

final class ParentingTests: XCTestCase {
  private var tracer: Tracer!
  private let tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

  override func setUp() {
    // upstream's TracerProvider adopts a TRACEPARENT env var as the parent of every root span
    unsetenv("TRACEPARENT")
    tracer = TracerProviderBuilder().build().get(instrumentationName: "t")
  }

  private func child(_ parent: SpanContext?) -> SpanData {
    let b = tracer.spanBuilder(spanName: "c")
    if let parent { b.setParent(parent) } else { b.setNoParent() }
    return (b.startSpan() as! ReadableSpan).toSpanData()
  }

  func testRoundTrip() {
    let s = tracer.spanBuilder(spanName: "p").startSpan()
    let t = traceparent(of: s.context)
    XCTAssertEqual(s.context.traceId.hexString, String(t.split(separator: "-")[1]))
    XCTAssertEqual(t, traceparent(of: contextFrom(traceparent: t)!))
    XCTAssertEqual(tp, traceparent(of: contextFrom(traceparent: tp)!))
  }

  func testChildHasParentIdAndIsNotRemote() {
    let d = child(contextFrom(traceparent: tp))
    XCTAssertEqual(d.parentSpanId?.hexString, "b7ad6b7169203331")
    XCTAssertEqual(d.traceId.hexString, "0af7651916cd43dd8448eb211c80319c")
    XCTAssertFalse(d.hasRemoteParent)
  }

  func testInvalidInputYieldsRoot() {
    for s in ["garbage", "", "ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
              "01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
              "00-0AF7651916CD43DD8448EB211C80319C-b7ad6b7169203331-01",
              "00-00000000000000000000000000000000-b7ad6b7169203331-01",
              "00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01",
              "00-0af7-b7ad6b7169203331-01", "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-zz",
              "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01\n"] {
      XCTAssertNil(contextFrom(traceparent: s), s)
      XCTAssertNil(child(contextFrom(traceparent: s)).parentSpanId, s)
    }
  }
}
