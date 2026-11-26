const path = require('path');

const POD = "pod 'ReactNativeOpenTelemetryCore'";

function addCorePod(podfile, podPath) {
  if (podfile.includes(POD)) return podfile;
  const out = podfile.replace(/^(target '.+' do\n)/m, `$1  ${POD}, :path => '${podPath}'\n`);
  if (out === podfile) throw new Error('react-native-open-telemetry: no `target ... do` in the Podfile; add the core pod by hand');
  return out;
}

const configPlugins = config =>
  require(require.resolve('expo/config-plugins', {paths: [config._internal?.projectRoot ?? process.cwd(), __dirname]}));

module.exports = config =>
  configPlugins(config).withPodfile(config, c => {
    c.modResults.contents = addCorePod(c.modResults.contents, path.relative(c.modRequest.platformProjectRoot, __dirname));
    return c;
  });
module.exports.addCorePod = addCorePod;
