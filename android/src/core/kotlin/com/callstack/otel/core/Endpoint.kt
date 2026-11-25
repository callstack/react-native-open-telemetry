package com.callstack.otel.core

import java.net.URI

/** Eager check (D8), no exporter built: http(s) scheme and a host. Returns an error message or null. */
internal fun validateExportUrl(url: String): String? {
  val u = try { URI(url) } catch (e: Exception) { return "invalid exportUrl: ${e.message}" }
  // URI.host is null for a host it rejects as a hostname, like `otel_collector`, which iOS and web accept
  val host = u.host ?: u.rawAuthority?.substringAfterLast('@')?.substringBefore(':')
  if (u.scheme?.lowercase() !in setOf("http", "https") || host.isNullOrEmpty()) {
    return "invalid exportUrl \"$url\": expected http(s)://host[:port]"
  }
  return null
}
