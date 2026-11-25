import com.callstack.otel.core.validateExportUrl
import kotlin.test.Test
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class EndpointTest {
  @Test fun acceptsUnderscoreHostsLikeIosAndWeb() {
    for (u in listOf("http://otel_collector:4318", "http://otel_collector", "https://user:pw@otel_collector:4318/x")) {
      assertNull(validateExportUrl(u), u)
    }
    for (u in listOf("not a url", "ftp://h:21", "http://", "http://:4318", "http://user@:4318")) {
      assertNotNull(validateExportUrl(u), u)
    }
  }
}
