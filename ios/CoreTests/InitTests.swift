import XCTest
import OpenTelemetrySdk
@testable import OtelCore

final class InitTests: XCTestCase {
  private let ok = CoreConfig(serviceName: "first", serviceVersion: "1.0", exportUrl: "http://127.0.0.1:1", exportHeaders: ["x-api-key": "test"])
  private func name(_ c: OtelCore?) -> String? { c?.resource.attributes["service.name"]?.description }
  override func setUp() { OtelCore.resetForTest() }
  override func tearDown() { OtelCore.resetForTest() }

  func testInitializeTwiceKeepsTheFirstConfig() {
    let a = OtelCore.initialize(ok, testMode: true)
    XCTAssertNil(a.error); XCTAssertFalse(a.alreadyInitialized)
    let core = OtelCore.instance
    var second = ok; second.serviceName = "second"
    let b = OtelCore.initialize(second, testMode: true)
    XCTAssertTrue(b.alreadyInitialized); XCTAssertNil(b.error)
    XCTAssertTrue(core === OtelCore.instance)
    XCTAssertEqual(name(core), "first")
  }

  func testInvalidUrlReturnsAnErrorAndNeverThrows() {
    for u in ["not a url", "ftp://h", "http://", "", "http:///x"] {
      OtelCore.resetForTest()
      var c = ok; c.exportUrl = u
      XCTAssertNotNil(OtelCore.initialize(c, testMode: true).error, u)
      XCTAssertNil(OtelCore.instance)
    }
  }

  func testAFailedInitIsSticky() {
    var bad = ok; bad.exportUrl = "not a url"
    let first = OtelCore.initialize(bad, testMode: true)
    let again = OtelCore.initialize(ok, testMode: true)
    XCTAssertEqual(first.error, again.error)
    XCTAssertTrue(again.alreadyInitialized)
    XCTAssertNil(OtelCore.instance)
  }

  func testInitializeWithoutConfigIsAnErrorButNotSticky() {
    XCTAssertNotNil(OtelCore.initialize(nil, testMode: true).error)
    let r = OtelCore.initialize(ok, testMode: true)
    XCTAssertNil(r.error); XCTAssertFalse(r.alreadyInitialized)
    XCTAssertNotNil(OtelCore.instance)
  }

  func testConcurrentInitializeCreatesOneCore() {
    DispatchQueue.concurrentPerform(iterations: 50) { _ in _ = OtelCore.initialize(ok, testMode: true) }
    let core = OtelCore.instance
    XCTAssertNotNil(core)
    XCTAssertTrue(OtelCore.initialize(ok, testMode: true).alreadyInitialized)
    XCTAssertTrue(core === OtelCore.instance)
  }

  func testDistroAttributesOutsideTestModeOnly() {
    let prod = OtelCore(config: ok, testMode: false, distroVersion: "9.9.9").resource.attributes
    XCTAssertEqual(prod["telemetry.distro.name"]?.description, "react-native-open-telemetry")
    XCTAssertEqual(prod["telemetry.distro.version"]?.description, "9.9.9")
    let test = OtelCore(config: ok, testMode: true, distroVersion: "9.9.9").resource.attributes
    XCTAssertNil(test["telemetry.distro.name"])
    XCTAssertNil(test["telemetry.sdk.name"])
  }

  func testResourceAttributesAreKept() {
    var c = ok; c.resourceAttributes = [CoreAttribute(key: "k", value: .string("v"))]
    XCTAssertEqual(OtelCore(config: c, testMode: true).resource.attributes["k"]?.description, "v")
  }
}
