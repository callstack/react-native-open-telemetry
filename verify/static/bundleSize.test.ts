import {bytesPerSource, checkBundleSize, isSdk} from './bundleSize';

const sec = (line: number, column: number, src: string) => ({offset: {line, column}, map: {sources: [src]}});

test('attributes each section the bytes up to the next one', () => {
  const m = bytesPerSource({sections: [sec(0, 0, 'a.js'), sec(1, 0, 'b.js'), sec(1, 3, 'a.js')]}, 'xxxx\nyyyzz');
  expect(Object.fromEntries(m)).toEqual({'a.js': 7, 'b.js': 3});
});

test('counts src/, lib/ and @opentelemetry/* only', () => {
  const sdk = isSdk('/r');
  expect(['/r/src/index.ts', '/r/lib/module/setup.js', '/r/node_modules/@opentelemetry/api/x.js', '/r/example/App.tsx', '/r/node_modules/react/x.js'].map(sdk))
    .toEqual([true, true, true, false, false]);
});

test('fails only above +10%', () => {
  expect(checkBundleSize(110, 100)).toBeUndefined();
  expect(checkBundleSize(111, 100)).toMatch(/over 110 B/);
});
