// Keeps native `async` (no @react-native/babel-preset), so `await` bypasses the patched `then` and the probe fails.
// Needs NODE_OPTIONS=--experimental-vm-modules: run via `bun run test`.
module.exports = {
  displayName: 'degraded',
  rootDir: '../..',
  testEnvironment: 'node',
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: ['@babel/preset-typescript'],
        plugins: ['@babel/plugin-transform-modules-commonjs'],
      },
    ],
  },
  setupFiles: ['<rootDir>/src/setup.ts'],
  testMatch: ['<rootDir>/verify/jest/degraded.test.ts'],
};
