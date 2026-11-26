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

func startOtel() {
  RNOtel.start { c in
    c.serviceName = "verify"
    c.export = .init(url: testExportUrl() ?? "http://localhost:4318/v1/traces", headers: ["x-api-key": "test"])
  }
  _ = RNOtel.tracer("opentelemetry.example")
}

private func testExportUrl() -> String? {
  #if OTEL_TEST_MODE
    let prefix = "--otel-export-url="
    return ProcessInfo.processInfo.arguments.first { $0.hasPrefix(prefix) }.map { String($0.dropFirst(prefix.count)) }
  #else
    return nil
  #endif
}
