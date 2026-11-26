const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withOtel} = require('../metro');

const root = path.resolve(__dirname, '..');
const own = p => path.join(__dirname, 'node_modules', p);
const single = ['react', 'react-native', 'react-native-nitro-modules', '@react-native'];
const escape = s => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  cacheVersion: `otel-test-mode=${process.env.OTEL_TEST_MODE ?? ''}`,
  watchFolders: [root, path.join(root, 'verify')],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
    blockList: single.map(m => new RegExp(`^${escape(path.join(root, 'node_modules', m))}[/\\\\].*`)),
    extraNodeModules: {...Object.fromEntries(single.map(m => [m, own(m)])), 'react-native-open-telemetry': root},
  },
};

module.exports = withOtel(mergeConfig(getDefaultConfig(__dirname), config));
