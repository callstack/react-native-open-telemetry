package struct CoreConfig {
  var serviceName: String
  var serviceVersion: String? = nil
  var resourceAttributes: [CoreAttribute] = []
  /// Base URL; see `tracesUrl`.
  var exportUrl: String
  var exportHeaders: [String: String] = [:]
  package init(serviceName: String, serviceVersion: String? = nil, resourceAttributes: [CoreAttribute] = [],
               exportUrl: String, exportHeaders: [String: String] = [:]) {
    self.serviceName = serviceName; self.serviceVersion = serviceVersion; self.resourceAttributes = resourceAttributes
    self.exportUrl = exportUrl; self.exportHeaders = exportHeaders
  }
}

/// Mirrors the seam's `SeamInitResult`.
package struct InitResult: Equatable {
  package var alreadyInitialized: Bool
  package var testMode: Bool
  package var error: String? = nil
}
