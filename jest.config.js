const transform = {
  '\\.[jt]sx?$': ['babel-jest', {presets: ['@react-native/babel-preset']}],
};

module.exports = {
  projects: [
    {
      displayName: 'harness',
      testEnvironment: 'node',
      transform,
      testMatch: [
        '<rootDir>/verify/static/**/*.test.ts',
        '<rootDir>/verify/harness/**/*.test.ts',
      ],
    },
    // scenarios, fixtures, degraded projects live under verify/jest/ (later tasks)
  ],
};
