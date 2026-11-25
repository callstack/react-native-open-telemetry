package com.margelo.nitro.callstack.testnative

import androidx.annotation.Keep
import com.callstack.otel.RNOtel
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.ReactApplication
import com.margelo.nitro.NitroModules
import java.util.concurrent.TimeUnit

/** App native code using the public helpers (spec §4.3): explicit parent from a traceparent, B's traceparent back to JS. */
// Constructed from JNI by name (TestNativeOnLoad.cpp): keep it through R8.
@DoNotStrip
@Keep
class HybridTestNative : HybridTestNativeSpec() {
  override fun doWork(traceparent: String, start: DoubleArray, end: DoubleArray): String {
    val span = RNOtel.tracer("test-native").spanBuilder("native.work")
      .setParent(RNOtel.contextFrom(traceparent)) // explicit, never thread-local; '' -> a root
      .setStartTimestamp(nanos(start), TimeUnit.NANOSECONDS)
      .startSpan()
    span.end(nanos(end), TimeUnit.NANOSECONDS)
    return RNOtel.traceparentOf(span)
  }

  override fun reload() {
    (NitroModules.applicationContext?.applicationContext as? ReactApplication)?.reactHost?.reload("verify")
  }

  private fun nanos(t: DoubleArray) = t[0].toLong() * 1_000_000_000L + t[1].toLong()
}
