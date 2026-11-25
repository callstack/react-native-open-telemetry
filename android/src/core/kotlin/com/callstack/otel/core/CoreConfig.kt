package com.callstack.otel.core

data class CoreConfig(
  val serviceName: String,
  val serviceVersion: String? = null,
  val resourceAttributes: List<SeamAttribute> = emptyList(),
  /** The OTLP/HTTP traces endpoint, used as given. */
  val exportUrl: String,
  val exportHeaders: Map<String, String> = emptyMap(),
)

/** Mirrors the seam's `SeamInitResult`. */
data class InitResult(val alreadyInitialized: Boolean, val testMode: Boolean, val error: String? = null)
