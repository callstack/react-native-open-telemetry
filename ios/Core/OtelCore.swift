import Foundation
import OpenTelemetryApi
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk

/// Test mode: `0b…` IDs, the native counterpart of JS `sequentialIds('0a')`.
private final class SequentialIds: IdGenerator, @unchecked Sendable {
  private let lock = NSLock()
  private var t = 0
  private var s = 0
  private func pad(_ n: Int, _ w: Int) -> String { "0b" + String(repeating: "0", count: w - String(n).count) + String(n) }
  func generateTraceId() -> TraceId { lock.withLock { t += 1; return TraceId(fromHexString: pad(t, 30)) } }
  func generateSpanId() -> SpanId { lock.withLock { s += 1; return SpanId(fromHexString: pad(s, 14)) } }
}

let distroName = "react-native-open-telemetry"

/// Built on first export (the export queue), so init on the main thread never constructs an HTTP client.
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

final class OtelCore {
  /// The one resource of the app; in test mode built from config only (no `telemetry.*`).
  let resource: Resource
  /// The native TracerProvider; JS spans join its batch processor.
  let tracerProvider: TracerProviderSdk
  private let bsp: BatchSpanProcessor
  private let exporter: LazyExporter

  init(config: CoreConfig, testMode: Bool = false, distroVersion: String = "unknown") {
    var attrs = attributes(of: config.resourceAttributes)
    attrs["service.name"] = .string(config.serviceName)
    if let v = config.serviceVersion { attrs["service.version"] = .string(v) }
    if !testMode {
      attrs["telemetry.distro.name"] = .string(distroName)
      attrs["telemetry.distro.version"] = .string(distroVersion)
    }
    resource = testMode ? Resource(attributes: attrs) : Resource().merging(other: Resource(attributes: attrs))

    // Upstream sends `envVarHeaders ?? config headers`: passing ours there (even empty) means exactly these headers,
    // never OTEL_EXPORTER_OTLP_HEADERS. Upstream's default gzip stays on.
    exporter = LazyExporter {
      URL(string: tracesUrl(config.exportUrl)).map {
        OtlpHttpTraceExporter(endpoint: $0, envVarHeaders: config.exportHeaders.map { ($0.key, $0.value) })
      }
    }
    bsp = BatchSpanProcessor(spanExporter: exporter)
    let b = TracerProviderBuilder().with(resource: resource).add(spanProcessor: bsp)
    tracerProvider = (testMode ? b.with(idGenerator: SequentialIds()) : b).build()
  }

  /// JS-thread work: wrap and enqueue only; SpanData is built on the export queue.
  func handOff(_ spans: [CoreSpan]) {
    for s in spans { bsp.onEnd(span: JsReadableSpan(s, resource: resource)) }
  }

  /// Blocks the caller up to `timeoutMs`. True when nothing is left unsent: the exporter requeues a failed batch,
  /// and its `flush` retries it.
  // ponytail: upstream BatchWorker race: if its timer thread has just taken the queue but not yet scheduled the
  // export, forceFlush finds nothing and returns before that batch is sent (true while in flight). TracerProviderSdk
  // forceFlush goes through the same worker; fix upstream or track in-flight spans if flush-after-reload needs it.
  func flush(timeoutMs: Double) -> Bool {
    let deadline = Date().addingTimeInterval(timeoutMs / 1000)
    bsp.forceFlush(timeout: timeoutMs / 1000)
    return exporter.flush(explicitTimeout: max(deadline.timeIntervalSinceNow, 0.001)) == .success
  }

  private static let lock = NSLock()
  private static var state: InitResult?
  private(set) static var instance: OtelCore?

  /// Idempotent. The first result sticks, a failed one too (R16): later calls never retry. A call without config
  /// before any init is an error but is not remembered, so the real init can still follow.
  @discardableResult
  static func initialize(_ config: CoreConfig?, testMode: Bool = false, distroVersion: String = "unknown") -> InitResult {
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
