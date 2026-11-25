// Expo config plugin: `"plugins": ["react-native-open-telemetry"]`. It does one thing. Autolinking links one podspec per
// package (the Nitro adapter), and the adapter needs the pure Swift core pod beside it, so this adds
// `pod 'ReactNativeOpenTelemetryCore'` to the generated Podfile. Bare apps add the same line by hand (README).
const path = require('path');

const POD = "pod 'ReactNativeOpenTelemetryCore'";

/** Adds the core pod to the first app target; idempotent. */
function addCorePod(podfile, podPath) {
  if (podfile.includes(POD)) return podfile;
  const out = podfile.replace(/^(target '.+' do\n)/m, `$1  ${POD}, :path => '${podPath}'\n`);
  if (out === podfile) throw new Error('react-native-open-telemetry: no `target ... do` in the Podfile; add the core pod by hand');
  return out;
}

// The app's own `expo`, not one beside this file: a linked or pnpm-installed package has none of its own.
const configPlugins = config =>
  require(require.resolve('expo/config-plugins', {paths: [config._internal?.projectRoot ?? process.cwd(), __dirname]}));

module.exports = config =>
  configPlugins(config).withPodfile(config, c => {
    c.modResults.contents = addCorePod(c.modResults.contents, path.relative(c.modRequest.platformProjectRoot, __dirname));
    return c;
  });
module.exports.addCorePod = addCorePod;
