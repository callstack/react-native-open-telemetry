package com.opentelemetry

data class Options(
    var debug: Boolean = true,
    var url: String? = null,
    var name: String = "default-service-name",
    var version: String = "0.0.0",
    var environment: String = "development",
)
