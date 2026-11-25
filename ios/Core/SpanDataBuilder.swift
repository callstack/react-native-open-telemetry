import Foundation
import OpenTelemetryApi
import OpenTelemetrySdk

/// R21/C5: Swift's SpanKind cases are not in API order, so map the API value explicitly. Unknown -> INTERNAL.
func spanKind(_ k: Int) -> SpanKind {
  switch k {
  case 1: return .server
  case 2: return .client
  case 3: return .producer
  case 4: return .consumer
  default: return .internal
  }
}

/// API SpanStatusCode (UNSET 0, OK 1, ERROR 2). Unknown -> UNSET.
private func statusOf(_ s: CoreStatus) -> Status {
  switch s.code {
  case 1: return .ok
  case 2: return .error(description: s.message ?? "")
  default: return .unset
  }
}

private func traceState(_ s: String?) -> TraceState {
  let entries = (s ?? "").split(separator: ",").compactMap { kv -> TraceState.Entry? in
    guard let i = kv.firstIndex(of: "=") else { return nil }
    return TraceState.Entry(key: kv[..<i].trimmingCharacters(in: .whitespaces),
                            value: kv[kv.index(after: i)...].trimmingCharacters(in: .whitespaces))
  }
  return TraceState(entries: entries) ?? TraceState()
}

private func spanContext(_ c: CoreSpanContext) -> SpanContext {
  SpanContext.create(traceId: TraceId(fromHexString: c.traceId), spanId: SpanId(fromHexString: c.spanId),
                     traceFlags: TraceFlags(fromByte: UInt8(truncatingIfNeeded: c.traceFlags)), traceState: traceState(c.traceState))
}

/// Fixed clock: a JS span is already over, nothing here may read the wall clock.
private final class FixedClock: Clock {
  let now: Date
  init(now: Date) { self.now = now }
}

/**
 * A finished JS span handed over the seam (R19): the frozen `ReadableSpan` the native BatchSpanProcessor queues.
 * Only the span context is built on the JS thread (onEnd checks `sampled`); `toSpanData()` runs on the BSP worker.
 * SpanData has no public initializer, so it is built through the SDK's own `SpanSdk`, the public factory upstream uses.
 */
final class JsReadableSpan: ReadableSpan, @unchecked Sendable {
  private let span: CoreSpan
  private let resource: Resource
  let context: SpanContext

  init(_ span: CoreSpan, resource: Resource) {
    self.span = span
    self.resource = resource
    context = spanContext(span.context)
  }

  var kind: SpanKind { spanKind(span.kind) }
  var isRecording: Bool { false }
  var hasEnded: Bool { true }
  var latency: TimeInterval { span.end.date.timeIntervalSince(span.start.date) }
  var description: String { "JsReadableSpan{\(span.name)}" }
  // frozen: setters and mutators are no-ops
  var name: String { get { span.name } set {} }
  var status: Status { get { statusOf(span.status) } set {} }
  var instrumentationScopeInfo: InstrumentationScopeInfo {
    InstrumentationScopeInfo(name: span.scope.name, version: span.scope.version, schemaUrl: span.scope.schemaUrl,
                             attributes: attributes(of: span.scope.attributes))
  }

  func getAttributes() -> [String: AttributeValue] { attributes(of: span.attributes) }

  func toSpanData() -> SpanData {
    let attrs = getAttributes()
    var dict = AttributesDictionary(capacity: max(attrs.count, 1))
    dict.updateValues(attributes: attrs)
    let links = span.links.map { SpanData.Link(context: spanContext($0.context), attributes: attributes(of: $0.attributes)) }
    let parent = span.parentSpanId.map {
      SpanContext.create(traceId: context.traceId, spanId: SpanId(fromHexString: $0), traceFlags: context.traceFlags, traceState: context.traceState)
    }
    let end = span.end.date
    let limits = SpanLimits()
      .settingEventCountLimit(UInt(max(span.events.count, 1)))
      .settingLinkCountLimit(UInt(max(links.count, 1)))
    let sdk = SpanSdk.startSpan(context: context, name: span.name, instrumentationScopeInfo: instrumentationScopeInfo,
                                kind: kind, parentContext: parent, hasRemoteParent: false, spanLimits: limits,
                                spanProcessor: MultiSpanProcessor(spanProcessors: []), clock: FixedClock(now: end),
                                resource: resource, attributes: dict, links: links, totalRecordedLinks: links.count,
                                startTime: span.start.date)
    for e in span.events {
      sdk.addEvent(name: e.name, attributes: attributes(of: e.attributes), timestamp: e.time.date)
    }
    sdk.status = status
    sdk.end(time: end)
    return sdk.toSpanData()
  }

  func setAttribute(key: String, value: AttributeValue?) {}
  func setAttributes(_ attributes: [String: AttributeValue]) {}
  func addEvent(name: String) {}
  func addEvent(name: String, timestamp: Date) {}
  func addEvent(name: String, attributes: [String: AttributeValue]) {}
  func addEvent(name: String, attributes: [String: AttributeValue], timestamp: Date) {}
  func addLink(spanContext: SpanContext, attributes: [String: AttributeValue]) {}
  func recordException(_ exception: SpanException) {}
  func recordException(_ exception: SpanException, timestamp: Date) {}
  func recordException(_ exception: SpanException, attributes: [String: AttributeValue]) {}
  func recordException(_ exception: SpanException, attributes: [String: AttributeValue], timestamp: Date) {}
  func end() {}
  func end(time: Date) {}
}
