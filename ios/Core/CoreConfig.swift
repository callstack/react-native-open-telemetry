struct CoreConfig {
  var serviceName: String
  var serviceVersion: String? = nil
  var resourceAttributes: [CoreAttribute] = []
  /// Base URL; see `tracesUrl`.
  var exportUrl: String
  var exportHeaders: [String: String] = [:]
}

/// Mirrors the seam's `SeamInitResult`.
struct InitResult: Equatable {
  var alreadyInitialized: Bool
  var testMode: Bool
  var error: String? = nil
}
