import com.callstack.otel.core.*
import io.opentelemetry.sdk.resources.Resource
import kotlin.test.Test
import kotlin.test.assertEquals

class TraceStateTest {
  @Test fun multiEntryTraceStateKeepsItsOrder() {
    val h = HrTime(1.0, 0.0)
    val span = SeamSpan(
      SeamSpanContext("0a".padEnd(32, '1'), "0a".padEnd(16, '2'), 1, "a=1,b=2"), null, "s", 0, h, h,
      emptyList(), emptyList(), emptyList(), SeamStatus(0, null), SeamScope("t", null, null, emptyList()),
    )
    assertEquals("a=1,b=2", JsSpanData(span, Resource.empty()).spanContext.traceState.asMap().entries.joinToString(",") { "${it.key}=${it.value}" })
  }
}
