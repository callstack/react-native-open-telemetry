import {decodeFixture, encodeFixture} from '../fixtureJson';

test('fixture round trip keeps NaN, Infinity and -0', () => {
  const v = {a: [NaN, Infinity, -Infinity, -0, 0, 1.5], b: {c: -0}, s: 'x'};
  const json = encodeFixture(v);
  expect(JSON.parse(json).a[0]).toEqual({$num: 'NaN'});
  expect(JSON.parse(json).a[3]).toEqual({$num: '-0'});
  const d = decodeFixture(json) as any;
  expect(d.a[0]).toBeNaN();
  expect(d.a[1]).toBe(Infinity);
  expect(d.a[2]).toBe(-Infinity);
  expect(Object.is(d.a[3], -0)).toBe(true);
  expect(Object.is(d.a[4], 0)).toBe(true);
  expect(Object.is(d.b.c, -0)).toBe(true);
  expect(d.s).toBe('x');
});
