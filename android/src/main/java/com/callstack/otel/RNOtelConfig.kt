package com.callstack.otel

import com.callstack.otel.core.AttrValue
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.SeamAttribute

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
    resourceAttributes = resourceAttributes.map { (k, v) -> SeamAttribute(k, AttrValue.Str(v)) },
    exportUrl = export.url,
    exportHeaders = export.headers,
  )
}
