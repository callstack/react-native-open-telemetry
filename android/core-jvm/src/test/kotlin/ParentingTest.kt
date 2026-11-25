import com.callstack.otel.core.contextFrom
import com.callstack.otel.core.traceparentOf
import io.opentelemetry.api.trace.Span
import io.opentelemetry.context.Context
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse

class ParentingTest {
  private val tp = "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01"

  @Test fun roundTripsAsANonRemoteParent() {
    val span = Span.fromContext(contextFrom(tp))
    assertEquals(tp, traceparentOf(span))
    assertFalse(span.spanContext.isRemote)
  }

  @Test fun invalidInputYieldsRoot() {
    listOf("garbage", "", "ff-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      "01-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01",
      "00-0AF7651916CD43DD8448EB211C80319C-b7ad6b7169203331-01",
      "00-00000000000000000000000000000000-b7ad6b7169203331-01",
      "00-0af7651916cd43dd8448eb211c80319c-0000000000000000-01",
      "00-0af7-b7ad6b7169203331-01", "00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-zz",
    ).forEach { assertEquals(Context.root(), contextFrom(it), it) }
  }
}
