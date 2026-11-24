import Foundation
import NitroModules
import OpenTelemetryApi
import React
import ReactNativeOpenTelemetryCore

/// App native code using the public helpers (spec §4.3): explicit parent from a traceparent, B's traceparent back to JS.
class HybridTestNative: HybridTestNativeSpec {
  func doWork(traceparent: String, start: [Double], end: [Double]) throws -> String {
    let b = RNOtel.tracer("test-native").spanBuilder(spanName: "native.work").setStartTime(time: date(start))
    // explicit, never thread-local; '' -> a root
    if let parent = RNOtel.contextFrom(traceparent: traceparent) { b.setParent(parent) } else { b.setNoParent() }
    let span = b.startSpan()
    span.end(time: date(end))
    return RNOtel.traceparentOf(span)
  }

  func reload() throws {
    DispatchQueue.main.async { RCTTriggerReloadCommandListeners("verify") }
  }

  private func date(_ t: [Double]) -> Date { Date(timeIntervalSince1970: t[0] + t[1] / 1e9) }
}
