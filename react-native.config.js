// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md
// Nitro: the native code and nitrogen/generated are wired by android/build.gradle and the podspec.
// Two podspecs sit at the root; autolinking links only the Nitro adapter (apps add the Core pod, R24). podspecPath says
// which; RN CLI 20.2 and Expo 58 do not read it yet (CLI: the first `*.podspec` glob hit; Expo: the first sorted, both
// ReactNativeOpenTelemetry.podspec today).
module.exports = {
  dependency: {
    platforms: {
      ios: {podspecPath: 'ReactNativeOpenTelemetry.podspec'},
      android: {},
    },
  },
};
