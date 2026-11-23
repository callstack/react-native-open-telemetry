import com.callstack.otel.core.AttrValue
import com.callstack.otel.core.SeamAttribute
import com.callstack.otel.core.attributesOf
import io.opentelemetry.api.common.AttributeKey.doubleArrayKey
import io.opentelemetry.api.common.AttributeKey.doubleKey
import io.opentelemetry.api.common.AttributeKey.longArrayKey
import io.opentelemetry.api.common.AttributeKey.longKey
import kotlin.test.Test
import kotlin.test.assertEquals

class AttributesTest {
  private fun num(v: Double) = attributesOf(listOf(SeamAttribute("k", AttrValue.Num(v))))

  @Test fun wholeIsLong() = assertEquals(1L, num(1.0).get(longKey("k")))
  @Test fun fractionIsDouble() = assertEquals(1.5, num(1.5).get(doubleKey("k")))
  @Test fun bigWholeIsLong() = assertEquals(9007199254740994L, num(9.007199254740994E15).get(longKey("k")))
  @Test fun nanIsDouble() = assertEquals(Double.NaN, num(Double.NaN).get(doubleKey("k")))
  @Test fun infIsDouble() = assertEquals(Double.NEGATIVE_INFINITY, num(Double.NEGATIVE_INFINITY).get(doubleKey("k")))
  // C28: Number.isInteger(-0) is true, so -0 is intValue 0 (the reviewed odd-attributes contract)
  @Test fun negZeroIsLong() = assertEquals(0L, num(-0.0).get(longKey("k")))
  @Test fun beyondLongIsDouble() = assertEquals(1e19, num(1e19).get(doubleKey("k")))

  @Test fun wholeArrayIsLongArray() {
    val a = attributesOf(listOf(SeamAttribute("k", AttrValue.Nums(listOf(1.0, 2.0)))))
    assertEquals(listOf(1L, 2L), a.get(longArrayKey("k")))
  }

  @Test fun mixedArrayIsDoubleArray() {
    val a = attributesOf(listOf(SeamAttribute("k", AttrValue.Nums(listOf(1.0, 2.5)))))
    assertEquals(listOf(1.0, 2.5), a.get(doubleArrayKey("k")))
  }
}
