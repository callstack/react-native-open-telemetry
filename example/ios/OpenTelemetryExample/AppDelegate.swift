import ReactNativeOpenTelemetryCore
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    startOtel()
    return true
  }
}

// otel-init: verify/nightly/app.sh appends this line and everything below it to a freshly generated AppDelegate.swift.
/// Native-first init, before React Native. No serviceVersion: the test-mode resource is service.name only (R2).
func startOtel() {
  RNOtel.start { c in
    c.serviceName = "verify"
    // the e2e collector on the host; asserted by verify/e2e/export-headers.e2e.ts
    c.export = .init(url: testExportUrl() ?? "http://localhost:4318", headers: ["x-api-key": "test"])
  }
  // compile check: the otel API is part of RNOtel's public surface (a no-op tracer is cheap to build)
  _ = RNOtel.tracer("opentelemetry.example")
}

/// Test-mode builds only: verify/e2e/native-init-failure.e2e.ts launches with `--otel-export-url=<url>`.
private func testExportUrl() -> String? {
  #if OTEL_TEST_MODE
    let prefix = "--otel-export-url="
    return ProcessInfo.processInfo.arguments.first { $0.hasPrefix(prefix) }.map { String($0.dropFirst(prefix.count)) }
  #else
    return nil
  #endif
}
