const PACKAGE = 'react-native-open-telemetry';

/**
 * Metro helper: runs the SDK's setup (context patch) before the app.
 * Appending to `getModulesRunBeforeMainModule` puts it after RN's InitializeCore and before any app module.
 * Metro only runs such an entry if it is already in the bundle graph; `src/index.ts` imports `./setup` for that.
 * The package is also excluded from inline requires (`nonInlinedRequires`): an inlined import whose only use is
 * platform-dead code (e.g. inside `Platform.OS === 'android'` on iOS) would otherwise drop the package, and setup,
 * from a release graph.
 */
function withOtel(config, {setupPath = require.resolve('react-native-open-telemetry/setup')} = {}) {
  const serializer = config.serializer ?? {};
  const original = serializer.getModulesRunBeforeMainModule ?? (() => []);
  if (original.__withOtel) return config;
  const wrapped = entry => {
    const list = original(entry);
    return list.includes(setupPath) ? list : [...list, setupPath];
  };
  wrapped.__withOtel = true;

  const transformer = config.transformer ?? {};
  const getTransformOptions = transformer.getTransformOptions ?? (async () => ({}));
  const transformOptions = async (...args) => {
    const opts = (await getTransformOptions(...args)) ?? {};
    const keep = opts.transform?.nonInlinedRequires ?? [];
    return {
      ...opts,
      transform: {...opts.transform, nonInlinedRequires: keep.includes(PACKAGE) ? keep : [...keep, PACKAGE]},
    };
  };
  return {
    ...config,
    serializer: {...serializer, getModulesRunBeforeMainModule: wrapped},
    transformer: {...transformer, getTransformOptions: transformOptions},
  };
}

module.exports = {withOtel};
