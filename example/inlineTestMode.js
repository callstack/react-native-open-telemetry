const inlineTestMode = ({types: t}) => {
  const visit = p => {
    if (p.get('object').matchesPattern('process.env') && t.isIdentifier(p.node.property, {name: 'OTEL_TEST_MODE'}))
      p.replaceWith(process.env.OTEL_TEST_MODE == null ? t.identifier('undefined') : t.stringLiteral(process.env.OTEL_TEST_MODE));
  };
  return {visitor: {MemberExpression: visit, OptionalMemberExpression: visit}};
};

module.exports = inlineTestMode;
