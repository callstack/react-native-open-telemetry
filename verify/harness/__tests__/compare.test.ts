import fs from 'fs';
import os from 'os';
import path from 'path';
import {compareToExpected, diffOtlp, formatReport} from '../compare';

const otlp = (span: any = {}) => ({
  resourceSpans: [
    {
      resource: {attributes: []},
      scopeSpans: [
        {
          scope: {name: 's'},
          spans: [{traceId: '0a01', spanId: '0a02', name: 'child', kind: 1, ...span}],
        },
      ],
    },
  ],
});

test('diffOtlp reports missing parentSpanId', () => {
  const d = diffOtlp(otlp({parentSpanId: '0a01'}), otlp());
  expect(d).toEqual([
    {spanId: '0a02', spanName: 'child', path: 'parentSpanId', expected: '0a01', actual: undefined},
  ]);
});

test("formatReport matches the spec's failure text", () => {
  const diffs = diffOtlp(otlp({parentSpanId: '0a01'}), otlp());
  expect(formatReport('nest-after-await', 'android', diffs)).toBe(
    [
      '✗ nest-after-await [android]  span 0a02 "child"',
      '    parentSpanId  expected "0a01"  got (none)',
      '  expected: verify/expected/nest-after-await.otlp.json',
      '  actual:   verify/artifacts/nest-after-await.android.otlp.json',
      '  scenario: verify/scenarios/nest-after-await.ts',
    ].join('\n'),
  );
});

describe('compareToExpected', () => {
  let dir: string;
  const old = {VERIFY_DIR: process.env.VERIFY_DIR, VERIFY_UPDATE: process.env.VERIFY_UPDATE};
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-'));
    fs.mkdirSync(path.join(dir, 'expected'));
    process.env.VERIFY_DIR = dir;
    delete process.env.VERIFY_UPDATE;
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(old))
      v === undefined ? delete process.env[k] : (process.env[k] = v);
    fs.rmSync(dir, {recursive: true, force: true});
  });
  test('update mode writes the file and passes', () => {
    const o = otlp();
    process.env.VERIFY_UPDATE = '1';
    const r = compareToExpected('sc', 'js', o);
    expect(r.ok).toBe(true);
    expect(r.report).toMatch(/^updated .*sc\.otlp\.json$/);
    const f = path.join(dir, 'expected/sc.otlp.json');
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual(o);
    process.env.VERIFY_UPDATE = '';
    expect(compareToExpected('sc', 'js', o).ok).toBe(true);
  });

  test('exact mismatch fails and names the field', () => {
    const o = otlp({status: {code: 1}});
    fs.writeFileSync(path.join(dir, 'expected/sc.otlp.json'), JSON.stringify(otlp({status: {code: 2}})));
    const r = compareToExpected('sc', 'js', o);
    expect(r.ok).toBe(false);
    expect(r.report).toContain('status.code  expected 2  got 1');
    expect(r.report).toContain('expected: verify/expected/sc.otlp.json');
  });

  test('missing expected file fails with a clear report', () => {
    const r = compareToExpected('sc', 'js', otlp());
    expect(r.ok).toBe(false);
    expect(r.report).toContain('file  expected');
    expect(r.report).toContain('got (none)');
  });

  test('draft writes a missing file but still fails, and never overwrites', () => {
    const o = otlp();
    const f = path.join(dir, 'expected/sc.otlp.json');
    const r = compareToExpected('sc', 'js', o, {draft: true});
    expect(r).toEqual({ok: false, report: 'drafted verify/expected/sc.otlp.json, review it'});
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual(o);
    expect(compareToExpected('sc', 'js', o, {draft: true}).ok).toBe(true);
    const r2 = compareToExpected('sc', 'js', otlp({status: {code: 1}}), {draft: true});
    expect(r2.ok).toBe(false);
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual(o);
  });

  test('iOS never writes the shared file', () => {
    process.env.VERIFY_UPDATE = '1';
    expect(compareToExpected('sc', 'ios', otlp()).ok).toBe(false);
    delete process.env.VERIFY_UPDATE;
    expect(compareToExpected('sc', 'ios', otlp(), {draft: true}).ok).toBe(false);
    expect(fs.existsSync(path.join(dir, 'expected/sc.otlp.json'))).toBe(false);
  });
});

describe('iOS known gaps', () => {
  const full = otlp({
    startTimeUnixNano: '1767225600000100000',
    flags: 257,
    traceState: 'k=v',
    links: [{traceId: '0f01', spanId: '0f02', flags: 257, traceState: 'k=v'}],
    events: [{name: 'e', timeUnixNano: '1767225600000010000'}],
  });
  (full.resourceSpans[0]!.scopeSpans[0] as any).schemaUrl = 'https://opentelemetry.io/schemas/1.40.0';
  // what opentelemetry-swift writes for the same span
  const ios = otlp({
    startTimeUnixNano: '1767225600000099840',
    links: [{traceId: '0f01', spanId: '0f02'}],
    events: [{name: 'e', timeUnixNano: '1767225600000010160'}],
  });

  test('times within 256 ns and the five unwritten fields pass on iOS only', () => {
    expect(diffOtlp(full, ios, 'ios')).toEqual([]);
    expect(diffOtlp(full, ios, 'android').map(d => d.path).sort()).toEqual(
      ['events[0].timeUnixNano', 'flags', 'links[0].flags', 'links[0].traceState', 'scopeSchemaUrl', 'startTimeUnixNano', 'traceState'],
    );
  });

  test('anything else, or a time off by more than 256 ns, still fails on iOS', () => {
    const off = otlp({startTimeUnixNano: '1767225600000099743', links: [{traceId: '0f01', spanId: '0f02'}],
      events: [{name: 'e', timeUnixNano: '1767225600000010000'}], name: 'other'});
    expect(diffOtlp(full, off, 'ios').map(d => d.path).sort()).toEqual(['name', 'startTimeUnixNano']);
  });
});
