import Foundation
@testable import OtelCore

/// Test reader for verify/fixtures/<name>.handoff.json; NaN, ±Infinity and -0 arrive as {"$num": "<name>"}.
enum FixtureJson {
  static func parse(_ data: Data, exportUrl: String) throws -> (CoreConfig, [CoreSpan]) {
    let root = try JSONSerialization.jsonObject(with: data) as! [String: Any]
    let c = root["config"] as! [String: Any]
    let config = CoreConfig(
      serviceName: c["serviceName"] as! String,
      serviceVersion: c["serviceVersion"] as? String,
      resourceAttributes: attrs(c["resourceAttributes"]),
      exportUrl: (c["exportUrl"] as! String).replacingOccurrences(of: "<collector>", with: exportUrl),
      exportHeaders: Dictionary(attrs(c["exportHeaders"]).map { a -> (String, String) in
        guard case let .string(v) = a.value else { fatalError("header \(a.key) is not a string") }
        return (a.key, v)
      }, uniquingKeysWith: { _, b in b })
    )
    return (config, (root["spans"] as! [[String: Any]]).map(span))
  }

  private static func isBool(_ v: Any) -> Bool {
    guard let n = v as? NSNumber else { return false }
    return CFGetTypeID(n) == CFBooleanGetTypeID()
  }

  private static func num(_ v: Any) -> Double {
    if let o = v as? [String: Any], let s = o["$num"] as? String {
      switch s {
      case "-0": return -0.0
      case "NaN": return .nan
      case "Infinity": return .infinity
      case "-Infinity": return -.infinity
      default: fatalError("unknown $num \(s)")
      }
    }
    return (v as! NSNumber).doubleValue
  }

  private static func time(_ v: Any?) -> HrTime { HrTime((v as! [Any]).map(num)) }

  private static func value(_ v: Any) -> CoreValue {
    if let a = v as? [Any] {
      guard let first = a.first else { return .bools([]) }
      if first is String { return .strings(a.map { $0 as! String }) }
      if isBool(first) { return .bools(a.map { ($0 as! NSNumber).boolValue }) }
      return .numbers(a.map(num))
    }
    if let s = v as? String { return .string(s) }
    if isBool(v) { return .bool((v as! NSNumber).boolValue) }
    return .number(num(v))
  }

  private static func attrs(_ v: Any?) -> [CoreAttribute] {
    (v as? [[String: Any]] ?? []).map { CoreAttribute(key: $0["key"] as! String, value: value($0["value"]!)) }
  }

  private static func ctx(_ o: [String: Any]) -> CoreSpanContext {
    CoreSpanContext(traceId: o["traceId"] as! String, spanId: o["spanId"] as! String,
                    traceFlags: (o["traceFlags"] as! NSNumber).intValue, traceState: o["traceState"] as? String)
  }

  private static func span(_ o: [String: Any]) -> CoreSpan {
    let scope = o["scope"] as! [String: Any]
    let status = o["status"] as! [String: Any]
    return CoreSpan(
      context: ctx(o["context"] as! [String: Any]),
      parentSpanId: o["parentSpanId"] as? String,
      name: o["name"] as! String,
      kind: (o["kind"] as! NSNumber).intValue,
      start: time(o["start"]),
      end: time(o["end"]),
      attributes: attrs(o["attributes"]),
      events: (o["events"] as! [[String: Any]]).map {
        CoreEvent(name: $0["name"] as! String, time: time($0["time"]), attributes: attrs($0["attributes"]))
      },
      links: (o["links"] as! [[String: Any]]).map {
        CoreLink(context: ctx($0["context"] as! [String: Any]), attributes: attrs($0["attributes"]))
      },
      status: CoreStatus(code: (status["code"] as! NSNumber).intValue, message: status["message"] as? String),
      scope: CoreScope(name: scope["name"] as! String, version: scope["version"] as? String,
                       schemaUrl: scope["schemaUrl"] as? String, attributes: attrs(scope["attributes"]))
    )
  }
}
