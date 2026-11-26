package com.callstack.otel.core

import java.net.URI

internal fun validateExportUrl(url: String): String? {
  val u = try { URI(url) } catch (e: Exception) { return "invalid exportUrl: ${e.message}" }
  val host = u.host ?: u.rawAuthority?.substringAfterLast('@')?.substringBefore(':')
  if (u.scheme?.lowercase() !in setOf("http", "https") || host.isNullOrEmpty()) {
    return "invalid exportUrl \"$url\": expected http(s)://host[:port]"
  }
  return null
}
