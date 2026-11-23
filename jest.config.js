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
    {
      displayName: 'unit',
      testEnvironment: 'node',
      transform,
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.[jt]s',
        '<rootDir>/metro/__tests__/**/*.test.[jt]s',
        '<rootDir>/vite/__tests__/**/*.test.[jt]s',
      ],
    },
    '<rootDir>/verify/jest/jest.scenarios.config.js',
    '<rootDir>/verify/jest/jest.degraded.config.js',
  ],
};
