import OpenTelemetryApi
import XCTest
@testable import OtelCore

// The rest of the number rule (NaN, ±Infinity, -0, 2^53+2, int and double arrays) is pinned by the odd-attributes
// and rich-span fixtures that FixtureExportTests replays.
final class AttributesTests: XCTestCase {
  private func num(_ v: Double) -> AttributeValue? { attributes(of: [CoreAttribute(key: "k", value: .number(v))])["k"] }

  func testBeyondLongIsDouble() { XCTAssertEqual(num(1e19), .double(1e19)) }
  // 2^63 is the first double past Int64.max: Int(2^63) would trap
  func testTwoTo63IsDouble() { XCTAssertEqual(num(9.223372036854775807E18), .double(9.223372036854775807E18)) }

  // C4: a short HrTime never traps on the JS thread
  func testShortHrTimeReadsZero() {
    XCTAssertEqual(HrTime([]).seconds, 0)
    XCTAssertEqual(HrTime([5]).nanos, 0)
  }

  // R21/C5: Swift's SpanKind cases are not in API order; map by value
  func testKindByValue() {
    XCTAssertEqual([0, 1, 2, 3, 4, 9, -1].map(spanKind), [.internal, .server, .client, .producer, .consumer, .internal, .internal])
  }
}
