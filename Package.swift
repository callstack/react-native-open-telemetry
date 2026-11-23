// swift-tools-version:6.0
// The pure Swift core (ios/Core) and its tests, for `swift test` on the host (`bun verify fast-swift`).
// Apps never use this: CocoaPods builds ios/Core from the podspec, with the same opentelemetry-swift versions.
import Foundation
import PackageDescription

// ios/CoreTests is not in the npm package (package.json `files`), so the test target exists only in the repo.
let hasTests = FileManager.default.fileExists(atPath: URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("ios/CoreTests").path)

let package = Package(
  name: "ReactNativeOpenTelemetry",
  platforms: [.iOS(.v15), .macOS(.v12)],
  products: [.library(name: "OtelCore", targets: ["OtelCore"])],
  dependencies: [
    .package(url: "https://github.com/open-telemetry/opentelemetry-swift", .upToNextMinor(from: "2.6.0")),
    .package(url: "https://github.com/open-telemetry/opentelemetry-swift-core", .upToNextMinor(from: "2.6.0")),
  ],
  targets: [
    .target(
      name: "OtelCore",
      dependencies: [
        .product(name: "OpenTelemetryProtocolExporterHTTP", package: "opentelemetry-swift"),
        .product(name: "OpenTelemetrySdk", package: "opentelemetry-swift-core"),
      ],
      path: "ios/Core"
    ),
  ] + (hasTests ? [.testTarget(name: "OtelCoreTests", dependencies: ["OtelCore"], path: "ios/CoreTests")] : []),
  swiftLanguageModes: [.v5]
)
