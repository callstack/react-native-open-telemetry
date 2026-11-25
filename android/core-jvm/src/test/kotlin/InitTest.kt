import com.callstack.otel.core.AttrValue
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.OtelCore
import com.callstack.otel.core.SeamAttribute
import io.opentelemetry.api.common.AttributeKey
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertSame
import kotlin.test.assertTrue

class InitTest {
  private val ok = CoreConfig("first", "1.0", emptyList(), "http://127.0.0.1:1", mapOf("x-api-key" to "test"))
  @BeforeTest @AfterTest fun reset() = OtelCore.resetForTest()

  @Test fun initializeTwiceKeepsTheFirstConfig() {
    val a = OtelCore.initialize(ok, testMode = true)
    assertNull(a.error); assertFalse(a.alreadyInitialized)
    val core = OtelCore.instance
    val b = OtelCore.initialize(ok.copy(serviceName = "second"), testMode = true)
    assertTrue(b.alreadyInitialized); assertNull(b.error)
    assertSame(core, OtelCore.instance)
    assertEquals("first", core!!.resource.getAttribute(AttributeKey.stringKey("service.name")))
  }

  @Test fun aFailedInitIsSticky() {
    val first = OtelCore.initialize(ok.copy(exportUrl = "not a url"), testMode = true)
    val again = OtelCore.initialize(ok, testMode = true)
    assertEquals(first.error, again.error)
    assertNull(OtelCore.instance)
  }

  @Test fun initializeWithoutConfigIsAnErrorButNotSticky() {
    assertNotNull(OtelCore.initialize(null, testMode = true).error)
    val r = OtelCore.initialize(ok, testMode = true)
    assertNull(r.error); assertFalse(r.alreadyInitialized)
    assertNotNull(OtelCore.instance)
  }

  @Test fun distroAttributesOutsideTestModeOnly() {
    val prod = OtelCore(ok, testMode = false, distroVersion = "9.9.9").resource
    assertEquals("react-native-open-telemetry", prod.getAttribute(AttributeKey.stringKey("telemetry.distro.name")))
    assertEquals("9.9.9", prod.getAttribute(AttributeKey.stringKey("telemetry.distro.version")))
    val test = OtelCore(ok, testMode = true, distroVersion = "9.9.9").resource
    assertNull(test.getAttribute(AttributeKey.stringKey("telemetry.distro.name")))
    assertNull(test.getAttribute(AttributeKey.stringKey("telemetry.sdk.name")))
  }

  @Test fun resourceAttributesAreKept() {
    val c = ok.copy(resourceAttributes = listOf(SeamAttribute("k", AttrValue.Str("v"))))
    assertEquals("v", OtelCore(c, testMode = true).resource.getAttribute(AttributeKey.stringKey("k")))
  }
}
