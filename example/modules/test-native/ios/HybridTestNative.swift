import Foundation
import NitroModules
import OpenTelemetryApi
import React
import ReactNativeOpenTelemetryCore

class HybridTestNative: HybridTestNativeSpec {
  func doWork(traceparent: String, start: [Double], end: [Double]) throws -> String {
    let b = RNOtel.tracer("test-native").spanBuilder(spanName: "native.work").setStartTime(time: date(start))
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
