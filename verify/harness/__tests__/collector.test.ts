import fs from 'fs';
import os from 'os';
import path from 'path';
import {startCollector, type Collector} from '../collector';

let c: Collector;
let dir: string;
beforeEach(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'collector-'));
  c = await startCollector({port: 0, artifactsDir: dir});
});
afterEach(() => c.close());

const body = (name: string) =>
  JSON.stringify({
    resourceSpans: [
      {scopeSpans: [{spans: [{traceId: '0a'.padEnd(32, '0'), spanId: '0a00000000000001', name}]}]},
    ],
  });
const post = (b: string) =>
  fetch(`${c.url}/v1/traces`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: b,
  });

test('collector refuses then accepts', async () => {
  c.begin('s', 'js');
  c.refuse(503, 1);
  expect((await post(body('first'))).status).toBe(503);
  expect((await post(body('second'))).status).toBe(200);
  const out = await c.end();
  const spans = out.resourceSpans![0].scopeSpans[0].spans;
  expect(spans.map((s: any) => s.name)).toEqual(['second']);
  expect(fs.existsSync(path.join(dir, 's.js.otlp.json'))).toBe(true);
  expect(fs.existsSync(path.join(dir, 'raw', 's.js', '0.json'))).toBe(true);
  expect(fs.existsSync(path.join(dir, 'raw', 's.js', '0.headers.json'))).toBe(true);
});

test('collector answers CORS preflight', async () => {
  const r = await fetch(`${c.url}/v1/traces`, {
    method: 'OPTIONS',
    headers: {origin: 'http://x.test'},
  });
  expect(r.status).toBe(204);
  expect(r.headers.get('access-control-allow-origin')).toBe('*');
});

test('collector decodes protobuf bodies', async () => {
  const {Root} = require('protobufjs');
  const root = new Root();
  root.resolvePath = (_o: string, t: string) => path.join(__dirname, '..', 'proto', t);
  root.loadSync('opentelemetry/proto/collector/trace/v1/trace_service.proto');
  const T = root.lookupType('opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest');
  const buf = T.encode(T.fromObject({resourceSpans: [{scopeSpans: [{spans: [
    {traceId: Buffer.from('0a'.padEnd(32, '0'), 'hex'), spanId: Buffer.from('0a00000000000001', 'hex'), name: 'pb', startTimeUnixNano: '1767225600000000000'},
  ]}]}]})).finish();
  c.begin('p', 'js');
  const r = await fetch(`${c.url}/v1/traces`, {method: 'POST', headers: {'content-type': 'application/x-protobuf'}, body: buf});
  expect(r.status).toBe(200);
  const s = (await c.end()).resourceSpans![0].scopeSpans[0].spans[0];
  expect(s.spanId).toBe('0a00000000000001');
  expect(s.startTimeUnixNano).toBe('1767225600000000000');
  expect(fs.existsSync(path.join(dir, 'raw', 'p.js', '0.pb'))).toBe(true);
});

test('POST /_verify/end without begin is a 400, not a crash', async () => {
  const r = await fetch(`${c.url}/_verify/end`, {method: 'POST'});
  expect(r.status).toBe(400);
  expect((await post(body('still alive'))).status).toBe(200);
});

test('begin clears stale raw files; headers are kept per request', async () => {
  c.begin('r', 'js');
  await post(body('a'));
  await post(body('b'));
  await c.end();
  const raw = path.join(dir, 'raw', 'r.js');
  expect(fs.existsSync(path.join(raw, '0.headers.json'))).toBe(true);
  expect(fs.existsSync(path.join(raw, '1.headers.json'))).toBe(true);
  c.begin('r', 'js');
  await post(body('c'));
  await c.end();
  expect(fs.readdirSync(raw).sort()).toEqual(['0.headers.json', '0.json']);
});

test('begin rejects unsafe scenario/platform names', async () => {
  for (const [s, p] of [['', 'js'], ['a/b', 'js'], ['..', 'js'], ['a', ''], ['a', '../x']] as [string, string][])
    expect(() => c.begin(s, p)).toThrow();
  const r = await fetch(`${c.url}/_verify/begin`, {
    method: 'POST',
    body: JSON.stringify({scenario: '../x', platform: 'js'}),
  });
  expect(r.status).toBe(400);
});

test('collector gunzips content-encoding: gzip bodies', async () => {
  c.begin('g', 'ios');
  const r = await fetch(`${c.url}/v1/traces`, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'content-encoding': 'gzip'},
    body: require('zlib').gzipSync(body('zipped')),
  });
  expect(r.status).toBe(200);
  const out = await c.end();
  expect(out.resourceSpans![0].scopeSpans[0].spans.map((s: any) => s.name)).toEqual(['zipped']);
});
