import ReactNativeOpenTelemetryCore
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Native-first init, before React Native. No serviceVersion: the test-mode resource is service.name only (R2).
    RNOtel.start { c in
      c.serviceName = "verify"
      // the e2e collector on the host; asserted by verify/e2e/export-headers.e2e.ts
      c.export = .init(url: "http://localhost:4318", headers: ["x-api-key": "test"])
    }
    // compile check: the otel API is part of RNOtel's public surface (a no-op tracer is cheap to build)
    _ = RNOtel.tracer("opentelemetry.example")
    return true
  }
}
