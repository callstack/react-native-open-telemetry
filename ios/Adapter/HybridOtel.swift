import Foundation
import NitroModules
import ReactNativeOpenTelemetryCore

/// The seam, mapped 1:1 onto the Swift core (pod `ReactNativeOpenTelemetryCore`, R24).
class HybridOtel: HybridOtelSpec {
  func initialize(config: SeamConfig?) throws -> SeamInitResult {
    let r = RNOtel.initialize(config.map {
      CoreConfig(serviceName: $0.serviceName, serviceVersion: $0.serviceVersion,
                 resourceAttributes: attrs($0.resourceAttributes), exportUrl: $0.exportUrl,
                 exportHeaders: Dictionary($0.exportHeaders.compactMap { h in h.value.asType(String.self).map { (h.key, $0) } },
                                           uniquingKeysWith: { _, last in last }))
    })
    return SeamInitResult(alreadyInitialized: r.alreadyInitialized, testMode: r.testMode, error: r.error)
  }

  /// JS thread: copy the structs and enqueue; SpanData is built on the export queue.
  func handOff(spans: [SeamSpan]) throws {
    OtelCore.instance?.handOff(spans.map(span))
  }

  /// Off the JS thread (the flush blocks a global queue); resolves even when native never initialized.
  func flush(timeoutMs: Double) throws -> Promise<Void> {
    Promise.parallel { _ = OtelCore.instance?.flush(timeoutMs: timeoutMs) }
  }

  private func span(_ s: SeamSpan) -> CoreSpan {
    CoreSpan(context: ctx(s.context), parentSpanId: s.parentSpanId, name: s.name, kind: int(s.kind),
             start: HrTime(s.start), end: HrTime(s.end), attributes: attrs(s.attributes),
             events: s.events.map { CoreEvent(name: $0.name, time: HrTime($0.time), attributes: attrs($0.attributes)) },
             links: s.links.map { CoreLink(context: ctx($0.context), attributes: attrs($0.attributes)) },
             status: CoreStatus(code: int(s.status.code), message: s.status.message),
             scope: CoreScope(name: s.scope.name, version: s.scope.version, schemaUrl: s.scope.schemaUrl,
                              attributes: attrs(s.scope.attributes)))
  }

  private func ctx(_ c: SeamSpanContext) -> CoreSpanContext {
    CoreSpanContext(traceId: c.traceId, spanId: c.spanId, traceFlags: int(c.traceFlags), traceState: c.traceState)
  }

  /// Never traps on the JS thread (Int(Double) does on NaN or out of range).
  private func int(_ d: Double) -> Int { Int(exactly: d.rounded(.towardZero)) ?? 0 }

  private func attrs(_ a: [SeamAttribute]) -> [CoreAttribute] { a.map { CoreAttribute(key: $0.key, value: value($0.value)) } }

  private func value(_ v: AttrValue) -> CoreValue {
    switch v {
    case let .first(b): return .bool(b)
    case let .second(b): return .bools(b)
    case let .third(s): return .strings(s)
    case let .fourth(n): return .numbers(n)
    case let .fifth(s): return .string(s)
    case let .sixth(n): return .number(n)
    }
  }
}
