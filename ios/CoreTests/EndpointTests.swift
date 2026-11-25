import XCTest
@testable import OtelCore

final class EndpointTests: XCTestCase {
  func testAppendsTracesPathUnlessPresent() {
    for u in ["http://h:4318", "http://h:4318/", "http://h:4318/v1/traces", "http://h:4318/v1/traces/"] {
      XCTAssertEqual(tracesUrl(u), "http://h:4318/v1/traces", u)
    }
    XCTAssertEqual(tracesUrl("http://h/base"), "http://h/base/v1/traces")
  }
}
