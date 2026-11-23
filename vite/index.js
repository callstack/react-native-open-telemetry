/**
 * Vite helper: esbuild must not emit native async (the context patch can't see through it), and setup must run first.
 * Native async functions, async generators and `for await` all bypass the patch, so all three are lowered.
 * Plain CJS like metro/index.js: loads from node_modules in both ESM and CJS configs.
 * Targets Vite <= 7 (esbuild). Vite 8 (Rolldown/Oxc) ignores `esbuild.*`; revisit before supporting it.
 * Test-mode builds: the app config must define OTEL_TEST_MODE itself (see src/internal/testMode.ts).
 */
const NAME = 'react-native-open-telemetry';
const NO_NATIVE_ASYNC = {'async-await': false, 'async-generator': false, 'for-await': false};

function withOtel(config) {
  const plugins = config.plugins ?? [];
  if (plugins.some(p => p && p.name === NAME)) return config;
  const esbuildOptions = config.optimizeDeps?.esbuildOptions;
  return {
    ...config,
    esbuild: {...config.esbuild, supported: {...config.esbuild?.supported, ...NO_NATIVE_ASYNC}},
    optimizeDeps: {
      ...config.optimizeDeps,
      esbuildOptions: {...esbuildOptions, supported: {...esbuildOptions?.supported, ...NO_NATIVE_ASYNC}},
    },
    plugins: [
      ...plugins,
      {
        name: NAME,
        // 'pre' so build bundles the inline module (and so lowers it); head-prepend runs it before the app entry.
        transformIndexHtml: {
          order: 'pre',
          handler: () => [
            {tag: 'script', attrs: {type: 'module'}, children: "import 'react-native-open-telemetry/setup';", injectTo: 'head-prepend'},
          ],
        },
      },
    ],
  };
}

module.exports = {withOtel};
