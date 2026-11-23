import com.callstack.otel.core.AttrValue
import com.callstack.otel.core.CoreConfig
import com.callstack.otel.core.HrTime
import com.callstack.otel.core.SeamAttribute
import com.callstack.otel.core.SeamEvent
import com.callstack.otel.core.SeamLink
import com.callstack.otel.core.SeamScope
import com.callstack.otel.core.SeamSpan
import com.callstack.otel.core.SeamSpanContext
import com.callstack.otel.core.SeamStatus
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser

/** Test reader for verify/fixtures/<name>.handoff.json; NaN, ±Infinity and -0 arrive as {"$num": "<name>"}. */
object FixtureJson {
  fun parse(json: String, exportUrl: String): Pair<CoreConfig, List<SeamSpan>> {
    val root = JsonParser.parseString(json).asJsonObject
    val c = root["config"].asJsonObject
    val config = CoreConfig(
      serviceName = c["serviceName"].asString,
      serviceVersion = c.str("serviceVersion"),
      resourceAttributes = attrs(c["resourceAttributes"]),
      exportUrl = c["exportUrl"].asString.replace("<collector>", exportUrl),
      exportHeaders = attrs(c["exportHeaders"]).associate { it.key to (it.value as AttrValue.Str).value },
    )
    return config to root["spans"].asJsonArray.map { span(it.asJsonObject) }
  }

  private fun JsonObject.str(k: String) = get(k)?.takeUnless { it.isJsonNull }?.asString

  private fun num(e: JsonElement): Double =
    if (e.isJsonObject) e.asJsonObject["\$num"].asString.let { if (it == "-0") -0.0 else it.toDouble() } else e.asDouble

  private fun time(e: JsonElement) = HrTime.of(e.asJsonArray.map(::num).toDoubleArray())

  private fun value(e: JsonElement): AttrValue {
    if (e.isJsonArray) {
      val a = e.asJsonArray.toList()
      val first = a.firstOrNull() ?: return AttrValue.Bools(emptyList())
      return when {
        first.isJsonPrimitive && first.asJsonPrimitive.isString -> AttrValue.Strs(a.map { it.asString })
        first.isJsonPrimitive && first.asJsonPrimitive.isBoolean -> AttrValue.Bools(a.map { it.asBoolean })
        else -> AttrValue.Nums(a.map(::num))
      }
    }
    if (e.isJsonPrimitive && e.asJsonPrimitive.isString) return AttrValue.Str(e.asString)
    if (e.isJsonPrimitive && e.asJsonPrimitive.isBoolean) return AttrValue.Bool(e.asBoolean)
    return AttrValue.Num(num(e))
  }

  private fun attrs(e: JsonElement) =
    e.asJsonArray.map { it.asJsonObject.let { a -> SeamAttribute(a["key"].asString, value(a["value"])) } }

  private fun ctx(o: JsonObject) =
    SeamSpanContext(o["traceId"].asString, o["spanId"].asString, o["traceFlags"].asInt, o.str("traceState"))

  private fun span(o: JsonObject): SeamSpan {
    val scope = o["scope"].asJsonObject
    val status = o["status"].asJsonObject
    return SeamSpan(
      context = ctx(o["context"].asJsonObject),
      parentSpanId = o.str("parentSpanId"),
      name = o["name"].asString,
      kind = o["kind"].asInt,
      start = time(o["start"]),
      end = time(o["end"]),
      attributes = attrs(o["attributes"]),
      events = o["events"].asJsonArray.map {
        val ev = it.asJsonObject
        SeamEvent(ev["name"].asString, time(ev["time"]), attrs(ev["attributes"]))
      },
      links = o["links"].asJsonArray.map {
        val l = it.asJsonObject
        SeamLink(ctx(l["context"].asJsonObject), attrs(l["attributes"]))
      },
      status = SeamStatus(status["code"].asInt, status.str("message")),
      scope = SeamScope(scope["name"].asString, scope.str("version"), scope.str("schemaUrl"), attrs(scope["attributes"])),
    )
  }
}
