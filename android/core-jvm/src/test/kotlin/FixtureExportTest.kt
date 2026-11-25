import com.callstack.otel.core.OtelCore
import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Every seam fixture through the core into the live collector; fast-jvm compares the `android` artifacts in Node. */
class FixtureExportTest {
  private val collector = System.getenv("VERIFY_COLLECTOR").orEmpty()
  private val http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).build() // Node http ignores h2c upgrades

  private fun control(path: String, body: String = "{}") {
    val req = HttpRequest.newBuilder(URI("$collector/_verify/$path"))
      .POST(HttpRequest.BodyPublishers.ofString(body)).timeout(java.time.Duration.ofSeconds(30)).header("content-type", "application/json").build()
    val res = http.send(req, HttpResponse.BodyHandlers.ofString())
    assertEquals(200, res.statusCode(), "collector $path: ${res.body()}")
  }

  @Test fun everyFixtureExports() {
    assertTrue(collector.isNotEmpty(), "VERIFY_COLLECTOR is not set: run through `bun verify fast-jvm`")
    val fixtures = File(System.getenv("VERIFY_FIXTURES")).listFiles { f -> f.name.endsWith(".handoff.json") }!!.sorted()
    assertTrue(fixtures.isNotEmpty())
    for (f in fixtures) {
      val name = f.name.removeSuffix(".handoff.json")
      val (config, spans) = FixtureJson.parse(f.readText(), "$collector/v1/traces")
      control("begin", """{"scenario":"$name","platform":"android"}""")
      val core = OtelCore(config, testMode = true)
      core.handOff(spans)
      assertTrue(core.flush(10_000), "$name: flush timed out")
      control("end")
    }
  }
}
