import XCTest
import OpenTelemetryApi
@testable import OtelCore

final class ParentingTests: XCTestCase {
  private let tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

  func testRoundTripsAsANonRemoteParent() {
    let ctx = contextFrom(traceparent: tp)!
    XCTAssertEqual(tp, traceparent(of: ctx))
    XCTAssertFalse(ctx.isRemote)
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
    }
  }
}
