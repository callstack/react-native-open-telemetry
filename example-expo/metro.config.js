const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');
const {mergeConfig} = require('@expo/metro/metro-config');
const {withOtel} = require('../metro');

const root = path.resolve(__dirname, '..');
const own = p => path.join(__dirname, 'node_modules', p);
const single = ['react', 'react-native', 'react-native-nitro-modules', '@react-native'];
const escape = s => s.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
const block = dir => single.map(m => new RegExp(`^${escape(path.join(dir, 'node_modules', m))}[/\\\\].*`));

const config = {
  cacheVersion: `otel-test-mode=${process.env.OTEL_TEST_MODE ?? ''}`,
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')],
    blockList: [...block(root), ...block(path.join(root, 'example'))],
    extraNodeModules: {...Object.fromEntries(single.map(m => [m, own(m)])), 'react-native-open-telemetry': root},
    resolveRequest: (ctx, name, platform) =>
      platform === 'web' && name === 'react-native-nitro-modules'
        ? {type: 'sourceFile', filePath: path.join(__dirname, 'nitro-stub.web.ts')}
        : ctx.resolveRequest(ctx, name, platform),
  },
};

module.exports = withOtel(mergeConfig(getDefaultConfig(__dirname), config));
