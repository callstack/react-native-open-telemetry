import Foundation
import NitroModules
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk

/// Tracer-bullet stub (Task 7): proves the seam and the opentelemetry-swift link; the real adapter is Task 25.
class HybridOtel: HybridOtelSpec {
  func initialize(config: SeamConfig?) throws -> SeamInitResult {
    // Touch opentelemetry-swift so a broken package link fails here, not in Task 25.
    OtlpHttpTraceExporter().shutdown()
    #if OTEL_TEST_MODE
      let testMode = true
    #else
      let testMode = false
    #endif
    return SeamInitResult(alreadyInitialized: false, testMode: testMode, error: nil)
  }

  func handOff(spans: [SeamSpan]) throws {
    let attrs = spans.reduce(0) { $0 + $1.attributes.count }
    let events = spans.reduce(0) { $0 + $1.events.count }
    let links = spans.reduce(0) { $0 + $1.links.count }
    NSLog("%@", "RNOtel handOff spans=\(spans.count) attrs=\(attrs) events=\(events) links=\(links)")
  }

  func flush(timeoutMs: Double) throws -> Promise<Void> {
    return Promise.resolved()
  }
}
