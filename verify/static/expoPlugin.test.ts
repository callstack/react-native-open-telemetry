const {addCorePod} = require('../../app.plugin');

const podfile = "platform :ios, '15.1'\n\ntarget 'App' do\n  use_expo_modules!\nend\n";

test('adds the core pod to the app target, once', () => {
  const out = addCorePod(podfile, '../node_modules/react-native-open-telemetry');
  expect(out).toContain("target 'App' do\n  pod 'ReactNativeOpenTelemetryCore', :path => '../node_modules/react-native-open-telemetry'\n");
  expect(addCorePod(out, 'x')).toBe(out);
});

test('throws when there is no target to add it to', () => {
  expect(() => addCorePod("platform :ios, '15.1'\n", 'x')).toThrow(/by hand/);
});
