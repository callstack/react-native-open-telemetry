import Foundation
import OpenTelemetryApi
import UIKit

public enum RNOtel {
  #if OTEL_TEST_MODE
    static let testMode = true
  #else
    static let testMode = false
  #endif

  public static func start(_ configure: (RNOtelConfig) -> Void) {
    let c = RNOtelConfig()
    configure(c)
    let r = initialize(c.toCore())
    if let err = r.error, !r.alreadyInitialized { NSLog("RNOtel init failed; telemetry is off: %@", err) }
  }

  private static var observer: NSObjectProtocol?
  private static let lock = NSLock()

  package static func initialize(_ config: CoreConfig?) -> InitResult {
    let r = OtelCore.initialize(config, testMode: testMode, distroVersion: packageVersion)
    if let core = OtelCore.instance { lock.withLock { if observer == nil { observer = flushOnBackground(core) } } }
    return r
  }

  private static func flushOnBackground(_ core: OtelCore) -> NSObjectProtocol {
    NotificationCenter.default.addObserver(forName: UIApplication.willResignActiveNotification, object: nil, queue: .main) { _ in
      let app = UIApplication.shared
      var task = UIBackgroundTaskIdentifier.invalid
      let end = { if task != .invalid { app.endBackgroundTask(task); task = .invalid } }
      task = app.beginBackgroundTask(withName: "RNOtel flush", expirationHandler: end)
      DispatchQueue.global(qos: .utility).async {
        _ = core.flush(timeoutMs: 10_000)
        DispatchQueue.main.async(execute: end)
      }
    }
  }

  public static func tracer(_ name: String, version: String? = nil) -> any Tracer {
    guard let p = OtelCore.instance?.tracerProvider else { return DefaultTracer.instance }
    return p.get(instrumentationName: name, instrumentationVersion: version)
  }

  public static func contextFrom(traceparent: String) -> SpanContext? { ReactNativeOpenTelemetryCore.contextFrom(traceparent: traceparent) }

  public static func traceparentOf(_ span: any Span) -> String { traceparent(of: span.context) }
}
