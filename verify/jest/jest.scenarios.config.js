module.exports = {
  displayName: 'scenarios',
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {'\\.[jt]sx?$': ['babel-jest', {presets: ['@react-native/babel-preset']}]},
  testMatch: ['<rootDir>/verify/jest/scenarios.test.ts'],
};
