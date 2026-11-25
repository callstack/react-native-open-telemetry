import com.callstack.otel.core.AttrValue
import com.callstack.otel.core.SeamAttribute
import com.callstack.otel.core.attributesOf
import io.opentelemetry.api.common.AttributeKey.doubleKey
import kotlin.test.Test
import kotlin.test.assertEquals

// The rest of the number rule (NaN, ±Infinity, -0, 2^53+2, int and double arrays) is pinned by the odd-attributes
// and rich-span fixtures that FixtureExportTest replays.
class AttributesTest {
  @Test fun beyondLongIsDouble() =
    assertEquals(1e19, attributesOf(listOf(SeamAttribute("k", AttrValue.Num(1e19)))).get(doubleKey("k")))
}
