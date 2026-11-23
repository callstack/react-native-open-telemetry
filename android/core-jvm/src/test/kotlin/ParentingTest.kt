import com.callstack.otel.core.*
import io.opentelemetry.api.trace.Span
import io.opentelemetry.context.Context
import io.opentelemetry.sdk.trace.ReadableSpan
import io.opentelemetry.sdk.trace.SdkTracerProvider
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ParentingTest {
  private val tracer = SdkTracerProvider.builder().addSpanProcessor(SimpleSpanProcessor.create(object : io.opentelemetry.sdk.trace.export.SpanExporter {
    override fun export(spans: Collection<io.opentelemetry.sdk.trace.data.SpanData>) = io.opentelemetry.sdk.common.CompletableResultCode.ofSuccess()
    override fun flush() = io.opentelemetry.sdk.common.CompletableResultCode.ofSuccess()
    override fun shutdown() = io.opentelemetry.sdk.common.CompletableResultCode.ofSuccess()
  })).build().get("t")
  private val tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

  private fun child(ctx: Context) = tracer.spanBuilder("c").setParent(ctx).startSpan() as ReadableSpan

  @Test fun roundTrip() {
    val s = tracer.spanBuilder("p").startSpan()
    assertEquals(s.spanContext.traceId, traceparentOf(s).split("-")[1])
    assertEquals(traceparentOf(s), traceparentOf(Span.fromContext(contextFrom(traceparentOf(s)))))
    assertEquals(tp, traceparentOf(Span.fromContext(contextFrom(tp))))
  }

  @Test fun childHasParentIdAndIsNotRemote() {
    val d = child(contextFrom(tp)).toSpanData()
    assertEquals("b7ad6b7169203331", d.parentSpanId)
    assertEquals("0af7651916cd43dd8448eb211c80319c", d.traceId)
    assertFalse(d.parentSpanContext.isRemote)
  }

  @Test fun invalidInputYieldsRoot() {
    listOf("garbage", "", "ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      "01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      "00-0AF7651916CD43DD8448EB211C80319C-b7ad6b7169203331-01",
      "00-00000000000000000000000000000000-b7ad6b7169203331-01",
      "00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01",
      "00-0af7-b7ad6b7169203331-01", "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-zz",
    ).forEach {
      assertEquals(Context.root(), contextFrom(it), it)
      assertFalse(child(contextFrom(it)).toSpanData().parentSpanContext.isValid)
    }
  }
}
