import fs from 'fs';
import os from 'os';
import path from 'path';
import {compareToExpected, diffOtlp, formatReport, pending, pendingScenarios} from '../compare';
import {shapeOf} from '../shape';

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
      '  expected: verify/expected/nest-after-await.android.otlp.json',
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
  const writeShape = (o: any) =>
    fs.writeFileSync(path.join(dir, 'expected/sc.shape.json'), JSON.stringify(shapeOf(o)));

  test('update mode writes the file and passes', () => {
    const o = otlp();
    writeShape(o);
    process.env.VERIFY_UPDATE = '1';
    const r = compareToExpected('sc', 'js', o);
    expect(r.ok).toBe(true);
    expect(r.report).toMatch(/^updated .*sc\.js\.otlp\.json$/);
    const f = path.join(dir, 'expected/sc.js.otlp.json');
    expect(JSON.parse(fs.readFileSync(f, 'utf8'))).toEqual(o);
    process.env.VERIFY_UPDATE = '';
    expect(compareToExpected('sc', 'js', o).ok).toBe(true);
  });

  test('exact mismatch fails and names the field', () => {
    const o = otlp({status: {code: 1}});
    writeShape(o);
    fs.writeFileSync(path.join(dir, 'expected/sc.js.otlp.json'), JSON.stringify(otlp({status: {code: 2}})));
    const r = compareToExpected('sc', 'js', o);
    expect(r.ok).toBe(false);
    expect(r.report).toContain('status.code  expected 2  got 1');
    expect(r.report).toContain('expected: verify/expected/sc.js.otlp.json');
  });

  test('missing expected file fails with a clear report', () => {
    writeShape(otlp());
    const r = compareToExpected('sc', 'js', otlp());
    expect(r.ok).toBe(false);
    expect(r.report).toContain('file  expected');
    expect(r.report).toContain('got (none)');
  });

  test('shape mismatch report points at the shape file', () => {
    writeShape(otlp());
    const r = compareToExpected('sc', 'js', otlp({name: 'other'}));
    expect(r.report).toContain('expected: verify/expected/sc.shape.json');
  });

  test('update mode refuses when the shape differs', () => {
    writeShape(otlp());
    process.env.VERIFY_UPDATE = '1';
    const r = compareToExpected('sc', 'js', otlp({name: 'other'}));
    expect(r.ok).toBe(false);
    expect(fs.existsSync(path.join(dir, 'expected/sc.js.otlp.json'))).toBe(false);
  });
});

test('pending records the scenario', () => {
  pending('x');
  expect(pendingScenarios.has('x')).toBe(true);
});

test('spans are matched by spanId when reordered', () => {
  const two = (a: any, b: any) => {
    const o = otlp(a);
    o.resourceSpans[0]!.scopeSpans[0]!.spans.push({traceId: '0a01', kind: 1, ...b});
    return o;
  };
  const x = two({spanId: '0a02', name: 'a'}, {spanId: '0a03', name: 'b'});
  const y = two({spanId: '0a03', name: 'b'}, {spanId: '0a02', name: 'a'});
  expect(diffOtlp(x, y)).toEqual([]);
});

test('status and event diffs are reported', () => {
  const d = diffOtlp(
    otlp({status: {code: 2}, events: [{name: 'e', timeUnixNano: '1'}]}),
    otlp({events: []}),
  );
  const paths = d.map(x => x.path);
  expect(paths).toContain('status');
  expect(paths).toContain('events[0]');
});
