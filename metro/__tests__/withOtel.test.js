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
