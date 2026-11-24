const {withAndroidManifest, withAppBuildGradle, withGradleProperties, withPodfile} = require('expo/config-plugins');

// Autolinking links only the Nitro pod; its pure Swift core pod is declared in the Podfile (R24).
const CORE_POD = "  pod 'ReactNativeOpenTelemetryCore', :path => '../..'";

// Same as the bare example's app/build.gradle: the bundle task sees only this app's dir, so a change to the package
// (lib/, src/), the scenarios or OTEL_TEST_MODE would otherwise leave the old bundle in the APK.
const BUNDLE_INPUTS = `
// withOtelExample: rebundle when lib/, src/, verify/ or OTEL_TEST_MODE change
tasks.matching { it.name.startsWith("createBundle") }.configureEach {
    inputs.property("otelTestMode", System.getenv("OTEL_TEST_MODE") ?: "")
    inputs.files(fileTree("../../..") { include "lib/**", "src/**", "verify/scenarios/**", "verify/harness/*.ts" })
}
`;

/** Example-only (Task 28): what the bare example's native projects carry by hand, applied at `expo prebuild`. */
module.exports = config => {
  config = withPodfile(config, c => {
    if (!c.modResults.contents.includes(CORE_POD))
      c.modResults.contents = c.modResults.contents.replace(/^(target '.+' do\n)/m, `$1${CORE_POD}\n`);
    return c;
  });
  config = withAppBuildGradle(config, c => {
    if (!c.modResults.contents.includes('withOtelExample: rebundle')) c.modResults.contents += BUNDLE_INPUTS;
    return c;
  });
  // EXAMPLE-ONLY, DO NOT COPY: app-wide cleartext so the e2e collector (plain http, also with test mode off) is reachable.
  // ponytail: any host, not only 10.0.2.2 like the bare app's network_security_config. Only the CORE_POD step above is
  // what a real Expo app needs.
  config = withAndroidManifest(config, c => {
    c.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return c;
  });
  // Test mode is a build flag: `OTEL_TEST_MODE=1 expo prebuild` (Android); iOS takes it at `OTEL_TEST_MODE=1 pod install`.
  if (process.env.OTEL_TEST_MODE === '1')
    config = withGradleProperties(config, c => {
      c.modResults.push({type: 'property', key: 'otelTestMode', value: 'true'});
      return c;
    });
  return config;
};
