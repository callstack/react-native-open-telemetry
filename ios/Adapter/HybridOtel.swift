import Foundation
import NitroModules
import ReactNativeOpenTelemetryCore

/// The seam: JS spans are wrapped as otel `ReadableSpan`s here and queued in the core (pod `ReactNativeOpenTelemetryCore`,
/// R24). The core stays free of Nitro's C++-backed types, so the app's AppDelegate can import it without C++ interop.
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

  /// JS thread: wrap and enqueue; SpanData is built on the export queue.
  func handOff(spans: [SeamSpan]) throws {
    guard let core = OtelCore.instance else { return }
    core.handOff(spans.map { JsReadableSpan($0, resource: core.resource) })
  }

  /// Off the JS thread (the flush blocks a global queue); resolves even when native never initialized.
  func flush(timeoutMs: Double) throws -> Promise<Void> {
    Promise.parallel { _ = OtelCore.instance?.flush(timeoutMs: timeoutMs) }
  }
}
