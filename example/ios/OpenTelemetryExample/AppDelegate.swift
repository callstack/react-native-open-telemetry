import OpenTelemetry
import React
import ReactAppDependencyProvider
import React_RCTAppDelegate
import UIKit

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication
      .LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    OpenTelemetrySDK.start { options in
      options.name = "OpenTelemetryExample"
      options.version = "1.0.0-alpha"
      options.environment = "development"
      options.debug = true
    }

    let sdk = OpenTelemetrySDK.get()
    let nativeInitTracer = sdk.tracerProvider.get(
      instrumentationName: "native-init-tracer",
      instrumentationVersion: "1.0.0"
    )
    let span = nativeInitTracer.spanBuilder(spanName: "native-span-1")
      .startSpan()
    span.setAttribute(key: "native-attr-key-1", value: "native-attr-value-1")

    self.moduleName = "OpenTelemetryExample"
    self.dependencyProvider = RCTAppDependencyProvider()

    // You can add your custom initial props in the dictionary below.
    // They will be passed down to the ViewController used by React Native.
    self.initialProps = [:]

    span.end()

    return super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions
    )
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
    #if DEBUG
      RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
      Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
