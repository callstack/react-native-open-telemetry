const {withOtel} = require('..');

const KEYS = ['async-await', 'async-generator', 'for-await'];
const html = config => config.plugins.find(p => p.name === 'react-native-open-telemetry').transformIndexHtml;

test('disables native async on esbuild and the dep optimizer', () => {
  const out = withOtel({});
  for (const k of KEYS) {
    expect(out.esbuild.supported[k]).toBe(false);
    expect(out.optimizeDeps.esbuildOptions.supported[k]).toBe(false);
  }
});

test('injects setup first, in dev and build', () => {
  const hook = html(withOtel({}));
  expect(hook.order).toBe('pre');
  expect(hook.handler()).toEqual([
    {tag: 'script', attrs: {type: 'module'}, children: "import 'react-native-open-telemetry/setup';", injectTo: 'head-prepend'},
  ]);
});

test("keeps the user's values and plugins", () => {
  const mine = {name: 'mine'};
  const out = withOtel({
    plugins: [mine],
    esbuild: {jsx: 'automatic', supported: {bigint: false}},
    optimizeDeps: {include: ['x'], esbuildOptions: {target: 'es2020', supported: {'top-level-await': true}}},
    base: '/b/',
  });
  expect(out.plugins[0]).toBe(mine);
  expect(out.esbuild).toMatchObject({jsx: 'automatic', supported: {bigint: false, 'async-await': false}});
  expect(out.optimizeDeps.include).toEqual(['x']);
  expect(out.optimizeDeps.esbuildOptions).toMatchObject({target: 'es2020', supported: {'top-level-await': true, 'async-await': false}});
  expect(out.base).toBe('/b/');
});

test('is idempotent when applied twice', () => {
  const once = withOtel({});
  const twice = withOtel(once);
  expect(twice.plugins.filter(p => p.name === 'react-native-open-telemetry')).toHaveLength(1);
  expect(twice).toEqual(once);
});
