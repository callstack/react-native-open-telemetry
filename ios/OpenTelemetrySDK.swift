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

        sdkResource.merge(
            other: Resource(attributes: [
                ResourceAttributes.serviceName.rawValue: AttributeValue.string(
                    options.name
                ),
                ResourceAttributes.serviceVersion.rawValue:
                    AttributeValue.string(
                        options.version
                    ),
                // TODO: try unifying to `deploymentEnvironment` across every platform
                ResourceAttributes.RawValue("environment"):
                    AttributeValue.string(
                        options.environment
                    ),
            ])
        )

        let logSpanExporter = options.debug ? StdoutSpanExporter() : nil
        let spanExporter = MultiSpanExporter(
            spanExporters: [logSpanExporter].compactMap { $0 }
        )
        spanProcessor = BatchSpanProcessor(spanExporter: spanExporter)
        let tracerProvider = TracerProviderBuilder()
            .with(resource: sdkResource)
            .add(spanProcessor: spanProcessor!)
            .build()

        OpenTelemetry.registerTracerProvider(tracerProvider: tracerProvider)
    }
}
