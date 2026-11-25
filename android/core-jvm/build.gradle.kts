plugins {
  kotlin("jvm") version "2.1.21"
}

kotlin { jvmToolchain(17) }

sourceSets.main { kotlin.srcDir("../src/core/kotlin") }

dependencies {
  implementation(platform("io.opentelemetry:opentelemetry-bom:1.68.0"))
  implementation("io.opentelemetry:opentelemetry-sdk")
  // No OkHttp exclusion here: the JVM tests run otel-java's own OkHttp 5; devices run React Native's 4.9.2.
  implementation("io.opentelemetry:opentelemetry-exporter-otlp")
  testImplementation(kotlin("test"))
  testImplementation("com.google.code.gson:gson:2.11.0")
}

tasks.test {
  useJUnitPlatform()
  // fast-jvm passes the live collector URL; the export test fails without it.
  environment("VERIFY_COLLECTOR", System.getenv("VERIFY_COLLECTOR") ?: "")
  environment("VERIFY_FIXTURES", file("../../verify/fixtures").absolutePath)
  outputs.upToDateWhen { false }
  testLogging { events("passed", "failed", "skipped"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL }
}
