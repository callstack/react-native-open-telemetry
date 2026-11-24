// Test mode is a build flag: inline process.env.OTEL_TEST_MODE at bundle time (e2e builds set it to 1).
const inlineTestMode = ({types: t}) => {
  const visit = p => {
    if (p.get('object').matchesPattern('process.env') && t.isIdentifier(p.node.property, {name: 'OTEL_TEST_MODE'}))
      p.replaceWith(process.env.OTEL_TEST_MODE == null ? t.identifier('undefined') : t.stringLiteral(process.env.OTEL_TEST_MODE));
  };
  return {visitor: {MemberExpression: visit, OptionalMemberExpression: visit}};
};

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlineTestMode],
};
module.exports.inlineTestMode = inlineTestMode; // reused by example-expo/babel.config.js
