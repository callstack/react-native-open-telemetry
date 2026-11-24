// Web example (Task 23): the bare example's ScenariosScreen through react-native-web, exporting with the web SDK.
import path from 'node:path';
import {defineConfig} from 'vite';
import {withOtel} from '../../vite/index.js';

const root = path.resolve(import.meta.dirname, '../..');

export default defineConfig(
  withOtel({
    root: import.meta.dirname,
    // test mode is a build flag (src/internal/testMode.ts); e2e.config.ts builds with OTEL_TEST_MODE=1
    define: {'process.env.OTEL_TEST_MODE': JSON.stringify(process.env.OTEL_TEST_MODE ?? '')},
    esbuild: {jsx: 'automatic'},
    resolve: {
      alias: [
        {find: /^react-native$/, replacement: 'react-native-web'},
        // the package as published, like Metro's extraNodeModules: the directory resolves through its `exports`
        // (the `browser` condition -> lib/module/index.web.js); build lib/ first with `bun run prepare`
        {find: /^react-native-open-telemetry$/, replacement: root},
        {find: /^react-native-open-telemetry\/setup$/, replacement: path.join(root, 'lib/module/setup.js')},
        // no HybridObjects on web: ScenariosScreen's native lookups find none
        {find: /^react-native-nitro-modules$/, replacement: path.join(import.meta.dirname, 'nitro-stub.ts')},
      ],
    },
    server: {fs: {allow: [root]}},
  }),
);
