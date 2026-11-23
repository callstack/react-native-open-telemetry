/**
 * Metro helper: runs the SDK's setup (context patch) before the app.
 * Appending to `getModulesRunBeforeMainModule` puts it after RN's InitializeCore and before any app module.
 * Metro only runs such an entry if it is already in the bundle graph; `src/index.ts` imports `./setup` for that.
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
  return {...config, serializer: {...serializer, getModulesRunBeforeMainModule: wrapped}};
}

module.exports = {withOtel};
