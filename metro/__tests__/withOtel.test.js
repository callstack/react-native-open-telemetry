const {withOtel} = require('..');

// Stubbed so the test does not depend on a built lib/ (self-reference via `exports`).
const SETUP = '/pkg/lib/module/setup.js';
const run = config => withOtel(config, {setupPath: SETUP}).serializer.getModulesRunBeforeMainModule('/app/index.js');
const CORE = '/rn/Libraries/Core/InitializeCore.js';
const base = {serializer: {getModulesRunBeforeMainModule: () => [CORE]}, resolver: {x: 1}};

test('adds setup after InitializeCore', () => {
  expect(run(base)).toEqual([CORE, SETUP]);
});

test("keeps a user's existing entries", () => {
  const cfg = {...base, serializer: {getModulesRunBeforeMainModule: () => [CORE, '/app/polyfill.js'], other: 2}};
  const out = withOtel(cfg, {setupPath: SETUP});
  expect(run(cfg)).toEqual([CORE, '/app/polyfill.js', SETUP]);
  expect(out.serializer.other).toBe(2);
  expect(out.resolver).toEqual({x: 1});
});

test('is idempotent when applied twice', () => {
  const once = withOtel(base, {setupPath: SETUP});
  expect(run(withOtel(once, {setupPath: SETUP}))).toEqual([CORE, SETUP]);
});

test('keeps the package out of inline requires, after the existing entries', async () => {
  const cfg = {
    ...base,
    transformer: {
      getTransformOptions: async () => ({transform: {inlineRequires: true, nonInlinedRequires: ['React']}, x: 1}),
    },
  };
  const out = await withOtel(cfg, {setupPath: SETUP}).transformer.getTransformOptions([], {}, () => []);
  expect(out).toEqual({transform: {inlineRequires: true, nonInlinedRequires: ['React', 'react-native-open-telemetry']}, x: 1});
  const bare = await withOtel(base, {setupPath: SETUP}).transformer.getTransformOptions([], {}, () => []);
  expect(bare.transform.nonInlinedRequires).toEqual(['react-native-open-telemetry']);
});

test('throws on an unmerged config instead of dropping InitializeCore', () => {
  expect(() => withOtel({resolver: {x: 1}}, {setupPath: SETUP})).toThrow(
    'apply withOtel to the merged config: withOtel(mergeConfig(getDefaultConfig(__dirname), config))',
  );
});
