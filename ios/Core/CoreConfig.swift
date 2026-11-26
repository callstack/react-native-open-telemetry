import OpenTelemetryApi

package struct CoreConfig {
  var serviceName: String
  var serviceVersion: String? = nil
  var resourceAttributes: [String: AttributeValue] = [:]
  var exportUrl: String
  var exportHeaders: [String: String] = [:]
  package init(serviceName: String, serviceVersion: String? = nil, resourceAttributes: [String: AttributeValue] = [:],
               exportUrl: String, exportHeaders: [String: String] = [:]) {
    self.serviceName = serviceName; self.serviceVersion = serviceVersion; self.resourceAttributes = resourceAttributes
    self.exportUrl = exportUrl; self.exportHeaders = exportHeaders
  }
}

package struct InitResult: Equatable {
  package var alreadyInitialized: Bool
  package var testMode: Bool
  package var error: String? = nil
}
