import Foundation
import OpenTelemetryApi
import OpenTelemetrySdk
import StdoutExporter

public final class OpenTelemetrySDK: NSObject {

    static var sdkResource = Resource.init()
    static var spanProcessor: BatchSpanProcessor? = nil

    public class Options {
        public var debug: Bool = true
        public var url: String?
        public var name: String = "default-service-name"
        public var version: String = "0.0.0"
        public var environment: String = "development"
    }
    
    public static func get() -> OpenTelemetry {
        return OpenTelemetry.instance
    }

    public static func start(_ configure: (Options) -> Void) {
        let options = Options()
        configure(options)

        let logSpanExporter = options.debug ? StdoutSpanExporter() : nil
        let spanExporter = MultiSpanExporter(spanExporters: [logSpanExporter].compactMap { $0 })
        spanProcessor = BatchSpanProcessor(spanExporter: spanExporter)
        let tracerProviderBuilder = TracerProviderBuilder()
        _ = tracerProviderBuilder.with(resource: sdkResource)
        if let spanProcessor = spanProcessor {
            _ = tracerProviderBuilder.add(spanProcessor: spanProcessor)
        }
        let tracerProvider = tracerProviderBuilder.build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }
}
