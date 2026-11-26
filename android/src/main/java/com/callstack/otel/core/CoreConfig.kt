package com.callstack.otel.core

import io.opentelemetry.api.common.Attributes

data class CoreConfig(
  val serviceName: String,
  val serviceVersion: String? = null,
  val resourceAttributes: Attributes = Attributes.empty(),
  val exportUrl: String,
  val exportHeaders: Map<String, String> = emptyMap(),
)

data class InitResult(val alreadyInitialized: Boolean, val testMode: Boolean, val error: String? = null)
