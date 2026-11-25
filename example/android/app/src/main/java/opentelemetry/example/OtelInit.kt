package opentelemetry.example

import android.app.Application
import com.callstack.otel.RNOtel
import java.io.File

/**
 * Native-first init, called from MainApplication.onCreate before React Native. Its own file so the main matrix
 * (verify/matrix/app.sh) can add it unchanged to a freshly generated app at another RN version.
 * No serviceVersion: the test-mode resource is service.name only (R2).
 */
internal fun Application.startOtel() {
  RNOtel.start(this) {
    serviceName = "verify"
    export {
      url = testExportUrl() ?: "http://10.0.2.2:4318/v1/traces" // the e2e collector on the host
      headers = mapOf("x-api-key" to "test") // asserted by verify/e2e/export-headers.e2e.ts
    }
  }
  // compile check: the otel API is part of RNOtel's public surface (a no-op tracer is cheap to build)
  RNOtel.tracer("opentelemetry.example")
}

/**
 * Test-mode builds only: verify/e2e/native-init-failure.e2e.ts overrides the URL. Application.onCreate cannot see
 * launch arguments (they reach the Activity), so the test writes this file with adb and removes it afterwards.
 */
private fun Application.testExportUrl(): String? =
  if (!BuildConfig.OTEL_TEST_MODE) null
  else File(getExternalFilesDir(null), "otel-export-url").takeIf { it.exists() }?.readText()?.trim()
