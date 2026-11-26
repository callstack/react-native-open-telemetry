import Foundation
import OpenTelemetryApi
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk

private final class SequentialIds: IdGenerator, @unchecked Sendable {
  private let lock = NSLock()
  private var t = 0
  private var s = 0
  private func pad(_ n: Int, _ w: Int) -> String { "0b" + String(repeating: "0", count: w - String(n).count) + String(n) }
  func generateTraceId() -> TraceId { lock.withLock { t += 1; return TraceId(fromHexString: pad(t, 30)) } }
  func generateSpanId() -> SpanId { lock.withLock { s += 1; return SpanId(fromHexString: pad(s, 14)) } }
}

let distroName = "react-native-open-telemetry"

private final class LazyExporter: SpanExporter, @unchecked Sendable {
  private let lock = NSLock()
  private var built: OtlpHttpTraceExporter?
  private let build: () -> OtlpHttpTraceExporter?
  init(_ build: @escaping () -> OtlpHttpTraceExporter?) { self.build = build }
  private var d: OtlpHttpTraceExporter? { lock.withLock { if built == nil { built = build() }; return built } }
  func export(spans: [SpanData], explicitTimeout: TimeInterval?) -> SpanExporterResultCode { d?.export(spans: spans, explicitTimeout: explicitTimeout) ?? .failure }
  func flush(explicitTimeout: TimeInterval?) -> SpanExporterResultCode { d?.flush(explicitTimeout: explicitTimeout) ?? .failure }
  func shutdown(explicitTimeout: TimeInterval?) { d?.shutdown(explicitTimeout: explicitTimeout) }
  func export(spans: [SpanData], explicitTimeout: TimeInterval?) async -> SpanExporterResultCode {
    guard let d else { return .failure }
    return await d.export(spans: spans, explicitTimeout: explicitTimeout)
  }
  func flush(explicitTimeout: TimeInterval?) async -> SpanExporterResultCode {
    guard let d else { return .failure }
    return await d.flush(explicitTimeout: explicitTimeout)
  }
  func shutdown(explicitTimeout: TimeInterval?) async { await d?.shutdown(explicitTimeout: explicitTimeout) }
}

package final class OtelCore {
  package let resource: Resource
  let tracerProvider: TracerProviderSdk
  private let bsp: BatchSpanProcessor
  private let exporter: LazyExporter

  init(config: CoreConfig, testMode: Bool = false, distroVersion: String = "unknown") {
    var attrs = config.resourceAttributes
    attrs["service.name"] = .string(config.serviceName)
    if let v = config.serviceVersion { attrs["service.version"] = .string(v) }
    if !testMode {
      attrs["telemetry.distro.name"] = .string(distroName)
      attrs["telemetry.distro.version"] = .string(distroVersion)
    }
    resource = testMode ? Resource(attributes: attrs) : Resource().merging(other: Resource(attributes: attrs))

    exporter = LazyExporter {
      URL(string: config.exportUrl).map {
        OtlpHttpTraceExporter(endpoint: $0, envVarHeaders: config.exportHeaders.map { ($0.key, $0.value) })
      }
    }
    bsp = BatchSpanProcessor(spanExporter: exporter, scheduleDelay: testMode ? 120 : 5)
    let b = TracerProviderBuilder().with(resource: resource).add(spanProcessor: bsp)
    tracerProvider = (testMode ? b.with(idGenerator: SequentialIds()) : b).build()
  }

  package func handOff(_ spans: [ReadableSpan]) {
    for s in spans { bsp.onEnd(span: s) }
  }

  package func flush(timeoutMs: Double) -> Bool {
    let deadline = Date().addingTimeInterval(timeoutMs / 1000)
    bsp.forceFlush(timeout: timeoutMs / 1000)
    return exporter.flush(explicitTimeout: max(deadline.timeIntervalSinceNow, 0.001)) == .success
  }

  private static let lock = NSLock()
  private static var state: InitResult?
  package private(set) static var instance: OtelCore?

  @discardableResult
  package static func initialize(_ config: CoreConfig?, testMode: Bool = false, distroVersion: String = "unknown") -> InitResult {
    lock.withLock {
      if var s = state { s.alreadyInitialized = true; return s }
      guard let config else { return InitResult(alreadyInitialized: false, testMode: testMode, error: "not initialized: no config") }
      let err = validateExportUrl(config.exportUrl)
      let result = InitResult(alreadyInitialized: false, testMode: testMode, error: err)
      if err == nil { instance = OtelCore(config: config, testMode: testMode, distroVersion: distroVersion) }
      state = result
      return result
    }
  }

  static func resetForTest() { lock.withLock { state = nil; instance = nil } }
}
