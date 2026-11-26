module.exports = {
  displayName: 'scenarios',
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {'\\.[jt]sx?$': ['babel-jest', {presets: ['@react-native/babel-preset']}]},
  setupFiles: ['<rootDir>/src/setup.ts'],
  testMatch: ['<rootDir>/verify/jest/scenarios.test.ts', '<rootDir>/verify/jest/handoff.test.ts'],
};
