package com.callstack.otel

import android.app.Application
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.InitResult
import com.callstack.otel.core.OtelCore
import com.margelo.nitro.callstack.otel.BuildConfig
import io.opentelemetry.api.OpenTelemetry
import io.opentelemetry.api.trace.Span
import io.opentelemetry.api.trace.Tracer
import io.opentelemetry.context.Context as OtelContext
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

object RNOtel {
  private const val TAG = "RNOtel"
  private val observing = AtomicBoolean()

  @JvmStatic
  fun start(context: Context, block: RNOtelConfig.() -> Unit) {
    try {
      val app = context.applicationContext
      if (processName() != app.packageName) return
      val r = initialize(RNOtelConfig().apply(block).toCore())
      if (r.error != null && !r.alreadyInitialized) Log.e(TAG, "init failed; telemetry is off: ${r.error}")
    } catch (e: Exception) {
      Log.e(TAG, "init failed; telemetry is off", e)
    }
  }

  internal fun initialize(config: CoreConfig?): InitResult {
    val r = OtelCore.initialize(config, BuildConfig.OTEL_TEST_MODE, BuildConfig.OTEL_DISTRO_VERSION)
    if (OtelCore.instance != null && observing.compareAndSet(false, true)) {
      Handler(Looper.getMainLooper()).post {
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
          override fun onStop(owner: LifecycleOwner) {
            OtelCore.instance?.tracerProvider?.forceFlush()
          }
        })
      }
    }
    return r
  }

  @JvmStatic
  @JvmOverloads
  fun tracer(name: String, version: String? = null): Tracer {
    val provider = OtelCore.instance?.tracerProvider ?: OpenTelemetry.noop().tracerProvider
    return provider.tracerBuilder(name).apply { version?.let(::setInstrumentationVersion) }.build()
  }

  @JvmStatic
  fun contextFrom(traceparent: String): OtelContext = com.callstack.otel.core.contextFrom(traceparent)

  @JvmStatic
  fun traceparentOf(span: Span): String = com.callstack.otel.core.traceparentOf(span)

  private fun processName(): String =
    if (Build.VERSION.SDK_INT >= 28) Application.getProcessName()
    else File("/proc/self/cmdline").readText().substringBefore('\u0000').trim()
}
