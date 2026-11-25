// The bare example's inline OTEL_TEST_MODE plugin (test mode is a bundle-time flag).
const inlineTestMode = require('../example/inlineTestMode');

module.exports = api => {
  // babel-preset-expo keeps native async on web, which the context patch cannot see through: lower it (README)
  const web = api.caller(c => c?.platform === 'web');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      inlineTestMode,
      ...(web ? ['@babel/plugin-transform-async-generator-functions', '@babel/plugin-transform-async-to-generator'] : []),
    ],
  };
};
