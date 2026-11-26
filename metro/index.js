const PACKAGE = 'react-native-open-telemetry';

function withOtel(config, {setupPath = require.resolve('react-native-open-telemetry/setup')} = {}) {
  const serializer = config.serializer ?? {};
  const original = serializer.getModulesRunBeforeMainModule;
  if (typeof original !== 'function') {
    throw new Error(
      `${PACKAGE}/metro: apply withOtel to the merged config: withOtel(mergeConfig(getDefaultConfig(__dirname), config))`,
    );
  }
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
