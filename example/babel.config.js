const inlineTestMode = require('./inlineTestMode');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlineTestMode],
};
