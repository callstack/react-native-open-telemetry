package com.callstack.otel

import com.callstack.otel.core.CoreConfig
import io.opentelemetry.api.common.Attributes

/** Native-first config (spec §4.4): `RNOtel.start(this) { serviceName = …; export { url = … } }`. */
class RNOtelConfig {
  var serviceName: String = ""
  var serviceVersion: String? = null
  var resourceAttributes: Map<String, String> = emptyMap()
  private var export = Export()

  class Export {
    /** The OTLP/HTTP traces endpoint (e.g. `https://collector:4318/v1/traces`), used as given. */
    var url: String = ""
    var headers: Map<String, String> = emptyMap()
  }

  fun export(block: Export.() -> Unit) {
    export = Export().apply(block)
  }

  internal fun toCore() = CoreConfig(
    serviceName = serviceName,
    serviceVersion = serviceVersion,
    resourceAttributes = Attributes.builder().apply { resourceAttributes.forEach { (k, v) -> put(k, v) } }.build(),
    exportUrl = export.url,
    exportHeaders = export.headers,
  )
}
