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
  const old = {...process.env};
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-'));
    fs.mkdirSync(path.join(dir, 'expected'));
    process.env.VERIFY_DIR = dir;
    delete process.env.VERIFY_UPDATE;
  });
  afterEach(() => {
    process.env = {...old};
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
