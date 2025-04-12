import OpenTelemetry
import React
import ReactAppDependencyProvider
import React_RCTAppDelegate
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    var reactNativeDelegate: ReactNativeDelegate?
    var reactNativeFactory: RCTReactNativeFactory?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let delegate = ReactNativeDelegate()
        let factory = RCTReactNativeFactory(delegate: delegate)
        delegate.dependencyProvider = RCTAppDependencyProvider()

        reactNativeDelegate = delegate
        reactNativeFactory = factory

        window = UIWindow(frame: UIScreen.main.bounds)

        factory.startReactNative(
            withModuleName: "OpenTelemetryExample",
            in: window,
            launchOptions: launchOptions
        )

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

        return true
    }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
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
