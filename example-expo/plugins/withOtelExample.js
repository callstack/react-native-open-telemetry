const {withAndroidManifest, withAppBuildGradle, withGradleProperties} = require('expo/config-plugins');

const BUNDLE_INPUTS = `
tasks.matching { it.name.startsWith("createBundle") }.configureEach {
    inputs.property("otelTestMode", System.getenv("OTEL_TEST_MODE") ?: "")
    inputs.files(fileTree("../../..") { include "lib/**", "src/**", "verify/scenarios/**", "verify/harness/*.ts" })
}
`;

module.exports = config => {
  config = withAppBuildGradle(config, c => {
    if (!c.modResults.contents.includes('withOtelExample: rebundle')) c.modResults.contents += BUNDLE_INPUTS;
    return c;
  });
  config = withAndroidManifest(config, c => {
    c.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
    return c;
  });
  if (process.env.OTEL_TEST_MODE === '1')
    config = withGradleProperties(config, c => {
      c.modResults.push({type: 'property', key: 'otelTestMode', value: 'true'});
      return c;
    });
  return config;
};
