package opentelemetry.example

import android.app.Application
import com.callstack.otel.RNOtel
import java.io.File

internal fun Application.startOtel() {
  RNOtel.start(this) {
    serviceName = "verify"
    export {
      url = testExportUrl() ?: "http://10.0.2.2:4318/v1/traces"
      headers = mapOf("x-api-key" to "test")
    }
  }
  RNOtel.tracer("opentelemetry.example")
}

private fun Application.testExportUrl(): String? =
  if (!BuildConfig.OTEL_TEST_MODE) null
  else File(getExternalFilesDir(null), "otel-export-url").takeIf { it.exists() }?.readText()?.trim()
