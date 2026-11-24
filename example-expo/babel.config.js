// The bare example's inline OTEL_TEST_MODE plugin (test mode is a bundle-time flag).
const {inlineTestMode} = require('../example/babel.config.js');

module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [inlineTestMode],
};
