import Foundation
import OpenTelemetryApi
import UIKit

/// `package.json` version, reported as `telemetry.distro.version`; the static stage checks it matches.
let packageVersion = "0.2.0"

/// Public native API (spec §4.3/§4.4). Test mode comes from the build (`OTEL_TEST_MODE=1 pod install`), never from here.
public enum RNOtel {
  #if OTEL_TEST_MODE
    static let testMode = true
  #else
    static let testMode = false
  #endif

  /// Native-first init from `AppDelegate`, before React Native. Never throws; an error is logged once.
  public static func start(_ configure: (RNOtelConfig) -> Void) {
    let c = RNOtelConfig()
    configure(c)
    if let err = initialize(c.toCore()).error { NSLog("RNOtel init failed; telemetry is off: %@", err) }
  }

  private static var observer: NSObjectProtocol?
  private static let lock = NSLock()

  /// One path for native-first and JS-fallback init. The exporter is built on first export, off the main thread.
  package static func initialize(_ config: CoreConfig?) -> InitResult {
    let r = OtelCore.initialize(config, testMode: testMode, distroVersion: packageVersion)
    if let core = OtelCore.instance { lock.withLock { if observer == nil { observer = flushOnBackground(core) } } }
    return r
  }

  /// Exports what is queued when the app goes to the background, inside a background task so iOS lets it finish.
  /// The flush blocks a global queue, never the main thread.
  private static func flushOnBackground(_ core: OtelCore) -> NSObjectProtocol {
    NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { _ in
      let app = UIApplication.shared
      var task = UIBackgroundTaskIdentifier.invalid
      // begin/end/expiration all run on the main thread, so `task` needs no lock
      let end = { if task != .invalid { app.endBackgroundTask(task); task = .invalid } }
      task = app.beginBackgroundTask(withName: "RNOtel flush", expirationHandler: end)
      DispatchQueue.global(qos: .utility).async {
        _ = core.flush(timeoutMs: 10_000)
        DispatchQueue.main.async(execute: end)
      }
    }
  }

  /// A tracer on the native provider; a no-op tracer before (or without) a successful init.
  public static func tracer(_ name: String, version: String? = nil) -> any Tracer {
    guard let p = OtelCore.instance?.tracerProvider else { return DefaultTracer.instance }
    return p.get(instrumentationName: name, instrumentationVersion: version)
  }

  /// W3C traceparent -> explicit, non-remote parent `SpanContext` for `setParent(_:)`; invalid input -> nil (a root).
  public static func contextFrom(traceparent: String) -> SpanContext? { ReactNativeOpenTelemetryCore.contextFrom(traceparent: traceparent) }

  public static func traceparentOf(_ span: any Span) -> String { traceparent(of: span.context) }
}
