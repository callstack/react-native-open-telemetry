# Guarded by the minified Expo release e2e (Task 28): recheck these rules on every otel-java bump.
# otel-java references optional, compile-only classes it never loads at runtime here (no autoconfigure, no incubator,
# annotations only); R8 in a minifying app fails on them as missing.
-dontwarn com.google.auto.value.**
-dontwarn com.google.errorprone.annotations.**
-dontwarn io.opentelemetry.api.incubator.**
-dontwarn io.opentelemetry.sdk.autoconfigure.spi.**

# otel-java's ResourceMarshaler reaches Resource/ResourceBuilder entity methods by reflection (EntityUtil) on every
# export; renamed or merged, the export throws and nothing is sent.
-keep class io.opentelemetry.sdk.resources.** { *; }
