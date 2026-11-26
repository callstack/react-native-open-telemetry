const inlineTestMode = require('../example/inlineTestMode');

module.exports = api => {
  const web = api.caller(c => c?.platform === 'web');
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      inlineTestMode,
      ...(web ? ['@babel/plugin-transform-async-generator-functions', '@babel/plugin-transform-async-to-generator'] : []),
    ],
  };
};
