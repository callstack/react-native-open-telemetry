import Foundation
import NitroModules
import OpenTelemetryApi
import OpenTelemetrySdk

/// Never traps on the JS thread (Int(Double) does on NaN or out of range).
func int(_ d: Double) -> Int { Int(exactly: d.rounded(.towardZero)) ?? 0 }

// Number.isInteger(v): whole and finite (-0 included). Int64.max as Double is 2^63, hence the exclusive bound.
private func isLong(_ v: Double) -> Bool { v == v.rounded() && v >= -9.223372036854775807E18 && v < 9.223372036854775807E18 }

/// JS numbers become `int` iff Number.isInteger (and they fit), else `double`; the same rule on JS and Kotlin.
func attributes(of list: [SeamAttribute]) -> [String: AttributeValue] {
  var out = [String: AttributeValue](minimumCapacity: list.count)
  for a in list {
    switch a.value {
    case let .first(v): out[a.key] = .bool(v)
    case let .second(v): out[a.key] = .boolArray(v)
    case let .third(v): out[a.key] = .stringArray(v)
    case let .fourth(v): out[a.key] = v.allSatisfy(isLong) ? .intArray(v.map { Int($0) }) : .doubleArray(v)
    case let .fifth(v): out[a.key] = .string(v)
    case let .sixth(v): out[a.key] = isLong(v) ? .int(Int(v)) : .double(v)
    }
  }
  return out
}

/// OTel HrTime `[seconds, nanos]`; missing elements read as 0. `Date` holds a Double of seconds, so whole µs
/// come back on a ~256 ns grid (verify/VERIFY.md).
private func date(_ t: [Double]) -> Date {
  Date(timeIntervalSince1970: (t.count > 0 ? t[0] : 0) + (t.count > 1 ? t[1] : 0) / 1e9)
}

/// R21/C5: Swift's SpanKind cases are not in API order, so map the API value explicitly. Unknown -> INTERNAL.
private func spanKind(_ k: Int) -> SpanKind {
  switch k {
  case 1: return .server
  case 2: return .client
  case 3: return .producer
  case 4: return .consumer
  default: return .internal
  }
}

/// API SpanStatusCode (UNSET 0, OK 1, ERROR 2). Unknown -> UNSET.
private func statusOf(_ s: SeamStatus) -> Status {
  switch int(s.code) {
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

private func spanContext(_ c: SeamSpanContext) -> SpanContext {
  SpanContext.create(traceId: TraceId(fromHexString: c.traceId), spanId: SpanId(fromHexString: c.spanId),
                     traceFlags: TraceFlags(fromByte: UInt8(truncatingIfNeeded: int(c.traceFlags))), traceState: traceState(c.traceState))
}

/// Fixed clock: a JS span is already over, nothing here may read the wall clock.
private final class FixedClock: Clock {
  let now: Date
  init(now: Date) { self.now = now }
}

/**
 * A finished JS span handed over the seam: the frozen `ReadableSpan` the native BatchSpanProcessor queues. It
 * keeps Nitro's struct; only the span context is built on the JS thread (onEnd checks `sampled`), `toSpanData()` runs
 * on the BSP worker. SpanData has no public initializer, so it is built through the SDK's own `SpanSdk`, the public
 * factory upstream uses.
 */
final class JsReadableSpan: ReadableSpan, @unchecked Sendable {
  private let span: SeamSpan
  private let resource: Resource
  let context: SpanContext

  init(_ span: SeamSpan, resource: Resource) {
    self.span = span
    self.resource = resource
    context = spanContext(span.context)
  }

  var kind: SpanKind { spanKind(int(span.kind)) }
  var isRecording: Bool { false }
  var hasEnded: Bool { true }
  var latency: TimeInterval { date(span.end).timeIntervalSince(date(span.start)) }
  var description: String { "JsReadableSpan{\(span.name)}" }
  // frozen: setters and mutators are no-ops
  var name: String { get { span.name } set {} }
  var status: Status { get { statusOf(span.status) } set {} }
  var instrumentationScopeInfo: InstrumentationScopeInfo {
    let scope = span.scope
    return InstrumentationScopeInfo(name: scope.name, version: scope.version, schemaUrl: scope.schemaUrl,
                                    attributes: attributes(of: scope.attributes))
  }

  func getAttributes() -> [String: AttributeValue] { attributes(of: span.attributes) }

  func toSpanData() -> SpanData {
    let attrs = getAttributes()
    var dict = AttributesDictionary(capacity: max(attrs.count, 1))
    dict.updateValues(attributes: attrs)
    let links = span.links.map { SpanData.Link(context: spanContext($0.context), attributes: attributes(of: $0.attributes)) }
    let events = span.events
    let parent = span.parentSpanId.map {
      SpanContext.create(traceId: context.traceId, spanId: SpanId(fromHexString: $0), traceFlags: context.traceFlags, traceState: context.traceState)
    }
    let end = date(span.end)
    let limits = SpanLimits()
      .settingEventCountLimit(UInt(max(events.count, 1)))
      .settingLinkCountLimit(UInt(max(links.count, 1)))
    let sdk = SpanSdk.startSpan(context: context, name: span.name, instrumentationScopeInfo: instrumentationScopeInfo,
                                kind: kind, parentContext: parent, hasRemoteParent: false, spanLimits: limits,
                                spanProcessor: MultiSpanProcessor(spanProcessors: []), clock: FixedClock(now: end),
                                resource: resource, attributes: dict, links: links, totalRecordedLinks: links.count,
                                startTime: date(span.start))
    for e in events {
      sdk.addEvent(name: e.name, attributes: attributes(of: e.attributes), timestamp: date(e.time))
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
