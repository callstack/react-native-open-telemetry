import com.callstack.otel.core.tracesUrl
import kotlin.test.Test
import kotlin.test.assertEquals

class EndpointTest {
  @Test fun appendsTracesPathUnlessPresent() {
    for (u in listOf("http://h:4318", "http://h:4318/", "http://h:4318/v1/traces", "http://h:4318/v1/traces/")) {
      assertEquals("http://h:4318/v1/traces", tracesUrl(u), u)
    }
    assertEquals("http://h/base/v1/traces", tracesUrl("http://h/base"))
  }
}
