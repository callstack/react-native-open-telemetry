package com.callstack.otel.core

import java.net.URI

/** Base URL -> traces endpoint: `/v1/traces` is appended unless already present (same rule as JS and iOS). */
fun tracesUrl(exportUrl: String): String {
  val base = exportUrl.trimEnd('/')
  return if (base.endsWith("/v1/traces")) base else "$base/v1/traces"
}

/** Eager check (D8), no exporter built: http(s) scheme and a host. Returns an error message or null. */
internal fun validateExportUrl(url: String): String? {
  val u = try { URI(url) } catch (e: Exception) { return "invalid exportUrl: ${e.message}" }
  if (u.scheme?.lowercase() !in setOf("http", "https") || u.host.isNullOrEmpty()) {
    return "invalid exportUrl \"$url\": expected http(s)://host[:port]"
  }
  return null
}
