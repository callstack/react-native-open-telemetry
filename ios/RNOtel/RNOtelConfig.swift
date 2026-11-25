/// Native-first config (spec §4.4): `RNOtel.start { c in c.serviceName = …; c.export = .init(url: …) }`.
public final class RNOtelConfig {
  public var serviceName = ""
  public var serviceVersion: String?
  public var resourceAttributes: [String: String] = [:]
  public var export = Export(url: "")

  public struct Export {
    /// The OTLP/HTTP traces endpoint (e.g. `https://collector:4318/v1/traces`), used as given.
    public var url: String
    public var headers: [String: String]
    public init(url: String, headers: [String: String] = [:]) { self.url = url; self.headers = headers }
  }

  init() {}

  func toCore() -> CoreConfig {
    CoreConfig(serviceName: serviceName, serviceVersion: serviceVersion,
               resourceAttributes: resourceAttributes.map { CoreAttribute(key: $0.key, value: .string($0.value)) },
               exportUrl: export.url, exportHeaders: export.headers)
  }
}
