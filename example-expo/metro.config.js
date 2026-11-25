const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');
const {mergeConfig} = require('@expo/metro/metro-config');
const {withOtel} = require('../metro');

const root = path.resolve(__dirname, '..');
const own = p => path.join(__dirname, 'node_modules', p);
// The repo root and the bare example have their own copies of these; the app must use exactly one.
const single = ['react', 'react-native', 'react-native-nitro-modules', '@react-native'];
const escape = s => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
const block = dir => single.map(m => new RegExp(`^${escape(path.join(dir, 'node_modules', m))}[/\\\\].*`));

const config = {
  // babel.config.js inlines OTEL_TEST_MODE; keep test-mode and normal transforms in separate caches
  cacheVersion: `otel-test-mode=${process.env.OTEL_TEST_MODE ?? ''}`,
  // the library (exports -> lib/), the bare example's ScenariosScreen and verify/
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
    blockList: [...block(root), ...block(path.join(root, 'example'))],
    extraNodeModules: {...Object.fromEntries(single.map(m => [m, own(m)])), 'react-native-open-telemetry': root},
    // web has no Nitro: ScenariosScreen's HybridObject lookups find none
    resolveRequest: (ctx, name, platform) =>
      platform === 'web' && name === 'react-native-nitro-modules'
        ? {type: 'sourceFile', filePath: path.join(__dirname, 'nitro-stub.web.ts')}
        : ctx.resolveRequest(ctx, name, platform),
  },
};

module.exports = withOtel(mergeConfig(getDefaultConfig(__dirname), config));
