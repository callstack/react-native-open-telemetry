// Web has no Nitro: no HybridObject is registered, so getOtel() is undefined and scenarios get no `native`.
export const NitroModules = {
  hasHybridObject: () => false,
  createHybridObject: () => undefined,
};
