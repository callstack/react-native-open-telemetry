import OpenTelemetryApi

public final class RNOtelConfig {
  public var serviceName = ""
  public var serviceVersion: String?
  public var resourceAttributes: [String: String] = [:]
  public var export = Export(url: "")

  public struct Export {
    public var url: String
    public var headers: [String: String]
    public init(url: String, headers: [String: String] = [:]) { self.url = url; self.headers = headers }
  }

  init() {}

  func toCore() -> CoreConfig {
    CoreConfig(serviceName: serviceName, serviceVersion: serviceVersion,
               resourceAttributes: resourceAttributes.mapValues { .string($0) },
               exportUrl: export.url, exportHeaders: export.headers)
  }
}
