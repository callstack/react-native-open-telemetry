import Foundation
import XCTest
@testable import OtelCore

/// Every seam fixture through the core into the live collector; fast-swift compares the `ios` artifacts in Node.
final class FixtureExportTests: XCTestCase {
  private let collector = ProcessInfo.processInfo.environment["VERIFY_COLLECTOR"] ?? ""
  private let fixtures = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    .appendingPathComponent("../../verify/fixtures").standardizedFileURL

  private func control(_ path: String, _ body: [String: String] = [:]) throws {
    var req = URLRequest(url: URL(string: "\(collector)/_verify/\(path)")!, timeoutInterval: 30)
    req.httpMethod = "POST"
    req.setValue("application/json", forHTTPHeaderField: "content-type")
    req.httpBody = try JSONSerialization.data(withJSONObject: body)
    let done = DispatchSemaphore(value: 0)
    var status = 0
    URLSession.shared.dataTask(with: req) { _, res, _ in
      status = (res as? HTTPURLResponse)?.statusCode ?? 0
      done.signal()
    }.resume()
    done.wait()
    XCTAssertEqual(status, 200, "collector \(path)")
  }

  func testEveryFixtureExports() throws {
    try XCTSkipIf(collector.isEmpty, "VERIFY_COLLECTOR is not set: run through `bun verify fast-swift`")
    let files = try FileManager.default.contentsOfDirectory(atPath: fixtures.path)
      .filter { $0.hasSuffix(".handoff.json") }.sorted()
    XCTAssertFalse(files.isEmpty)
    for f in files {
      let name = String(f.dropLast(".handoff.json".count))
      let (config, spans) = try FixtureJson.parse(Data(contentsOf: fixtures.appendingPathComponent(f)), exportUrl: collector + "/v1/traces")
      try control("begin", ["scenario": name, "platform": "ios"])
      let core = OtelCore(config: config, testMode: true)
      core.handOff(spans)
      XCTAssertTrue(core.flush(timeoutMs: 10_000), "\(name): flush failed")
      try control("end")
    }
  }
}
