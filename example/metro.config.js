const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const own = p => path.join(__dirname, 'node_modules', p);
// The repo root has its own (dev) copies of these; the app must use exactly one.
const single = ['react', 'react-native', 'react-native-nitro-modules', '@react-native'];
const escape = s => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  // babel.config.js inlines OTEL_TEST_MODE; keep test-mode and normal transforms in separate caches
  cacheVersion: `otel-test-mode=${process.env.OTEL_TEST_MODE ?? ''}`,
  // the library (src/) and the scenarios, fixtures and harness under verify/
  watchFolders: [root, path.join(root, 'verify')],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
    blockList: single.map(m => new RegExp(`^${escape(path.join(root, 'node_modules', m))}[/\\\\].*`)),
    extraNodeModules: Object.fromEntries(single.map(m => [m, own(m)])),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
