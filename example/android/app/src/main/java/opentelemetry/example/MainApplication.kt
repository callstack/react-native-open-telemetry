package opentelemetry.example

import android.app.Application
import com.callstack.otel.RNOtel
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import java.io.File

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Native-first init, before React Native. No serviceVersion: the test-mode resource is service.name only (R2).
    RNOtel.start(this) {
      serviceName = "verify"
      export {
        url = testExportUrl() ?: "http://10.0.2.2:4318" // the e2e collector on the host
        headers = mapOf("x-api-key" to "test") // asserted by verify/e2e/export-headers.e2e.ts
      }
    }
    // compile check: the otel API is part of RNOtel's public surface (a no-op tracer is cheap to build)
    RNOtel.tracer("opentelemetry.example")
    loadReactNative(this)
  }

  /**
   * Test-mode builds only: verify/e2e/native-init-failure.e2e.ts overrides the URL. Application.onCreate cannot see
   * launch arguments (they reach the Activity), so the test writes this file with adb and removes it afterwards.
   */
  private fun testExportUrl(): String? =
    if (!BuildConfig.OTEL_TEST_MODE) null
    else File(getExternalFilesDir(null), "otel-export-url").takeIf { it.exists() }?.readText()?.trim()
}
