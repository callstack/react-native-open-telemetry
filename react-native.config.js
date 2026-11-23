// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md
// Nitro: the native code and nitrogen/generated are wired by android/build.gradle and the podspec.
module.exports = {
  dependency: {
    platforms: {
      ios: {},
      android: {},
    },
  },
};
