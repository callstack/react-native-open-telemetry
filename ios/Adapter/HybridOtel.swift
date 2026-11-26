import Foundation
import NitroModules
import ReactNativeOpenTelemetryCore

class HybridOtel: HybridOtelSpec {
  func initialize(config: SeamConfig?) throws -> SeamInitResult {
    let r = RNOtel.initialize(config.map {
      CoreConfig(serviceName: $0.serviceName, serviceVersion: $0.serviceVersion,
                 resourceAttributes: attributes(of: $0.resourceAttributes), exportUrl: $0.exportUrl,
                 exportHeaders: Dictionary($0.exportHeaders.compactMap { h in h.value.asType(String.self).map { (h.key, $0) } },
                                           uniquingKeysWith: { _, last in last }))
    })
    return SeamInitResult(alreadyInitialized: r.alreadyInitialized, testMode: r.testMode, error: r.error)
  }

  func handOff(spans: [SeamSpan]) throws {
    guard let core = OtelCore.instance else { return }
    core.handOff(spans.map { JsReadableSpan($0, resource: core.resource) })
  }

  func flush(timeoutMs: Double) throws -> Promise<Void> {
    Promise.parallel { _ = OtelCore.instance?.flush(timeoutMs: timeoutMs) }
  }
}
