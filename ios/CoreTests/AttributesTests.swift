import OpenTelemetryApi
import XCTest
@testable import OtelCore

final class AttributesTests: XCTestCase {
  private func num(_ v: Double) -> AttributeValue? { attributes(of: [CoreAttribute(key: "k", value: .number(v))])["k"] }

  func testWholeIsLong() { XCTAssertEqual(num(1.0), .int(1)) }
  func testFractionIsDouble() { XCTAssertEqual(num(1.5), .double(1.5)) }
  func testBigWholeIsLong() { XCTAssertEqual(num(9.007199254740994E15), .int(9_007_199_254_740_994)) }
  func testNanIsDouble() {
    guard case let .double(d) = num(.nan) else { return XCTFail("not a double") }
    XCTAssertTrue(d.isNaN)
  }
  func testInfIsDouble() { XCTAssertEqual(num(-.infinity), .double(-.infinity)) }
  // C28: Number.isInteger(-0) is true, so -0 is intValue 0 (the reviewed odd-attributes contract)
  func testNegZeroIsLong() { XCTAssertEqual(num(-0.0), .int(0)) }
  func testBeyondLongIsDouble() { XCTAssertEqual(num(1e19), .double(1e19)) }
  // 2^63 is the first double past Int64.max: Int(2^63) would trap
  func testTwoTo63IsDouble() { XCTAssertEqual(num(9.223372036854775807E18), .double(9.223372036854775807E18)) }

  func testWholeArrayIsLongArray() {
    XCTAssertEqual(attributes(of: [CoreAttribute(key: "k", value: .numbers([1, 2]))])["k"], .intArray([1, 2]))
  }

  func testMixedArrayIsDoubleArray() {
    XCTAssertEqual(attributes(of: [CoreAttribute(key: "k", value: .numbers([1, 2.5]))])["k"], .doubleArray([1, 2.5]))
  }

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
