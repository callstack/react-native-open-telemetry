import Foundation

public final class OpenTelemetryConfiguration: NSObject {
    private static var isInitialized = false

    public static func start(name: String, version: String, environment: String) {
        isInitialized = true

        print("❤️ OpenTelemetry initialized!")
    }
}
