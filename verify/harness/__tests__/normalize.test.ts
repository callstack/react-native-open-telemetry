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

test('normalize keeps schemaUrl in the merge key and ignores attribute order', () => {
  const mk = (schemaUrl: string, attrs: string[]) => ({
    resourceSpans: [
      {
        schemaUrl,
        resource: {attributes: attrs.map(key => ({key, value: {stringValue: key}}))},
        scopeSpans: [{schemaUrl, scope: {name: 't'}, spans: [{spanId: schemaUrl + attrs[0]}]}],
      },
    ],
  });
  const same = normalize([mk('u1', ['a', 'b']), mk('u1', ['b', 'a'])]);
  expect(same.resourceSpans).toHaveLength(1);
  const diff = normalize([mk('u1', ['a']), mk('u2', ['a'])]);
  expect(diff.resourceSpans).toHaveLength(2);
  expect(diff.resourceSpans!.map((r: any) => r.schemaUrl).sort()).toEqual(['u1', 'u2']);
  const scopes = normalize([
    {resourceSpans: [{scopeSpans: [{schemaUrl: 'x', scope: {name: 't'}, spans: [{spanId: '1'}]}]}]},
    {resourceSpans: [{scopeSpans: [{schemaUrl: 'y', scope: {name: 't'}, spans: [{spanId: '2'}]}]}]},
  ]);
  expect(scopes.resourceSpans![0].scopeSpans).toHaveLength(2);
});

test('normalize sorts events and links without changing them', () => {
  const ev = (name: string, t: string) => ({name, timeUnixNano: t, attributes: [{key: 'b', value: {intValue: '1'}}, {key: 'a', value: {intValue: '2'}}]});
  const link = (spanId: string) => ({traceId: 't', spanId});
  const events = [ev('b', '5'), ev('a', '5'), ev('z', '1')];
  const links = [link('2'), link('1')];
  const out = normalize([{resourceSpans: [{scopeSpans: [{spans: [{spanId: '1', events, links}]}]}]}]);
  const s = out.resourceSpans![0].scopeSpans[0].spans[0];
  expect(s.events.map((e: any) => e.name)).toEqual(['z', 'a', 'b']);
  expect(s.links.map((l: any) => l.spanId)).toEqual(['1', '2']);
  expect(s.events[1].attributes.map((a: any) => a.key)).toEqual(['a', 'b']);
  expect(s.events[1].attributes[0]).toEqual({key: 'a', value: {intValue: '2'}});
  expect(s.events[0]).toMatchObject({name: 'z', timeUnixNano: '1'});
});
