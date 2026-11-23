import {normalize} from '../normalize';

const res = {attributes: [{key: 'service.name', value: {stringValue: 'a'}}]};
const span = (spanId: string, keys: string[]) => ({
  spanId,
  name: spanId,
  attributes: keys.map(key => ({key, value: {stringValue: key}})),
});
const req = (...spans: any[]) => ({
  resourceSpans: [{resource: res, scopeSpans: [{scope: {name: 't'}, spans}]}],
});

test('normalize merges two requests with the same resource into one resourceSpans', () => {
  const out = normalize([req(span('02', [])), req(span('01', []))]);
  expect(out.resourceSpans).toHaveLength(1);
  expect(out.resourceSpans![0].scopeSpans).toHaveLength(1);
  expect(out.resourceSpans![0].scopeSpans[0].spans).toHaveLength(2);
});

test('normalize sorts spans by spanId and attributes by key', () => {
  const out = normalize([req(span('02', ['b', 'a']), span('01', ['z', 'y']))]);
  const spans = out.resourceSpans![0].scopeSpans[0].spans;
  expect(spans.map((s: any) => s.spanId)).toEqual(['01', '02']);
  expect(spans[1].attributes.map((a: any) => a.key)).toEqual(['a', 'b']);
});

test('normalize never changes a value', () => {
  const input = [req(span('02', ['b', 'a']), span('01', ['z']))];
  const before = JSON.parse(JSON.stringify(input));
  const out = normalize(input);
  expect(input).toEqual(before);
  const byId = (spans: any[]) => Object.fromEntries(spans.map(s => [s.spanId, s]));
  const got = byId(out.resourceSpans![0].scopeSpans[0].spans);
  const want = byId(before[0].resourceSpans[0].scopeSpans[0].spans);
  expect(Object.keys(got).sort()).toEqual(Object.keys(want).sort());
  for (const id of Object.keys(want)) {
    expect(got[id].name).toBe(want[id].name);
    expect(got[id].attributes).toEqual(
      expect.arrayContaining(want[id].attributes),
    );
    expect(got[id].attributes).toHaveLength(want[id].attributes.length);
  }
});
