import {packContents} from './packContents';

const complete = ['package.json', 'lib/module/index.js', 'src/index.ts', 'nitrogen/generated/x.hpp', 'metro/index.js', 'android/build.gradle', 'ios/Adapter/HybridOtel.swift', 'ReactNativeOpenTelemetry.podspec', 'ReactNativeOpenTelemetryCore.podspec', 'app.plugin.js', 'react-native.config.js'];

test('reports missing nitrogen/', () => {
  expect(packContents(complete.filter(p => !p.startsWith('nitrogen/')))).toEqual(['nitrogen/']);
});

test('complete list has nothing missing', () => {
  expect(packContents(complete)).toEqual([]);
});
