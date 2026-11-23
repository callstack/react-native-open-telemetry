import Foundation
import OpenTelemetryApi
import OpenTelemetryProtocolExporterHttp
import OpenTelemetrySdk

/// Minimal config to export fixtures (R12); Task 19 adds tracesUrl, idempotent init and the distro attributes.
struct CoreConfig {
  let serviceName: String
  var serviceVersion: String? = nil
  var resourceAttributes: [CoreAttribute] = []
  /// Base URL; `/v1/traces` is appended.
  let exportUrl: String
  var exportHeaders: [String: String] = [:]
}

/// Test mode: `0b…` IDs, the native counterpart of JS `sequentialIds('0a')`.
private final class SequentialIds: IdGenerator, @unchecked Sendable {
  private let lock = NSLock()
  private var t = 0
  private var s = 0
  private func pad(_ n: Int, _ w: Int) -> String { "0b" + String(repeating: "0", count: w - String(n).count) + String(n) }
  func generateTraceId() -> TraceId { lock.withLock { t += 1; return TraceId(fromHexString: pad(t, 30)) } }
  func generateSpanId() -> SpanId { lock.withLock { s += 1; return SpanId(fromHexString: pad(s, 14)) } }
}

final class OtelCore {
  /// The one resource of the app; in test mode built from config only (no `telemetry.*`).
  let resource: Resource
  /// The native TracerProvider; JS spans join its batch processor.
  let tracerProvider: TracerProviderSdk
  private let bsp: BatchSpanProcessor
  private let exporter: OtlpHttpTraceExporter

  init(config: CoreConfig, testMode: Bool = false) {
    var attrs = attributes(of: config.resourceAttributes)
    attrs["service.name"] = .string(config.serviceName)
    if let v = config.serviceVersion { attrs["service.version"] = .string(v) }
    resource = testMode ? Resource(attributes: attrs) : Resource().merging(other: Resource(attributes: attrs))

    // ponytail: naive endpoint join; Task 19 brings tracesUrl ("append unless present") and URL validation.
    let base = config.exportUrl.hasSuffix("/") ? String(config.exportUrl.dropLast()) : config.exportUrl
    // Upstream sends `envVarHeaders ?? config headers`: passing ours there (even empty) means exactly these headers,
    // never OTEL_EXPORTER_OTLP_HEADERS. Upstream's default gzip stays on.
    exporter = OtlpHttpTraceExporter(endpoint: URL(string: base + "/v1/traces")!,
                                     envVarHeaders: config.exportHeaders.map { ($0.key, $0.value) })
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
}
