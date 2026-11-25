import fs from 'fs';
import path from 'path';
import type {OtlpJson} from './otlpJson';

export type Platform = 'js' | 'android' | 'ios' | 'web';
export type Diff = {spanId?: string; spanName?: string; path: string; expected: unknown; actual: unknown};

/** Scenarios not implemented yet; runners turn these into test.todo. */
export const pendingScenarios = new Set<string>();
export const pending = (scenario: string) => void pendingScenarios.add(scenario);

// VERIFY_DIR overrides the verify/ root (tests use temp dirs)
const root = () => process.env.VERIFY_DIR ?? path.join(__dirname, '..');
const rel = (sub: string, scenario: string, suffix: string) => `verify/${sub}/${scenario}.${suffix}`;
const abs = (sub: string, scenario: string, suffix: string) => path.join(root(), sub, `${scenario}.${suffix}`);

/** One expected file per scenario: every platform reports the same OTLP (see `iosView` for iOS's known gaps). */
export const expectedPath = (scenario: string): string => abs('expected', scenario, 'otlp.json');

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
// arrays of {key,...} (attributes) diff by key, not by index
const byKey = (v: unknown) =>
  Array.isArray(v) && v.length && v.every(x => isObj(x) && typeof x.key === 'string')
    ? Object.fromEntries(v.map(x => [x.key, x]))
    : v;

export function diffValues(e: unknown, a: unknown, p = ''): Diff[] {
  e = byKey(e);
  a = byKey(a);
  if (isObj(e) && isObj(a)) {
    const ks = [...new Set([...Object.keys(e), ...Object.keys(a)])];
    return ks.flatMap(k => diffValues(e[k], a[k], p ? `${p}.${k}` : k));
  }
  if (Array.isArray(e) && Array.isArray(a)) {
    const n = Math.max(e.length, a.length);
    return Array.from({length: n}, (_, i) => diffValues(e[i], a[i], `${p}[${i}]`)).flat();
  }
  return JSON.stringify(e) === JSON.stringify(a) ? [] : [{path: p, expected: e, actual: a}];
}

// one record per span, with its resource and scope attached
function spansOf(o: OtlpJson): Map<string, any> {
  const m = new Map<string, any>();
  for (const rs of o.resourceSpans ?? [])
    for (const ss of rs.scopeSpans ?? [])
      for (const s of ss.spans ?? [])
        m.set(s.spanId, {
          ...s,
          resource: rs.resource,
          resourceSchemaUrl: rs.schemaUrl,
          scope: ss.scope,
          scopeSchemaUrl: ss.schemaUrl,
        });
  return m;
}

/** opentelemetry-swift keeps times as `Date`: whole-µs times come back rounded to a ~256 ns grid, either way (R22). */
const IOS_TIME_STEP_NS = 256n;
const TIME_KEYS = ['startTimeUnixNano', 'endTimeUnixNano'] as const;
const snapTime = (e: any, a: any, k: string) => {
  if (typeof e?.[k] !== 'string' || typeof a?.[k] !== 'string') return;
  const d = BigInt(e[k]) - BigInt(a[k]);
  if (d >= -IOS_TIME_STEP_NS && d <= IOS_TIME_STEP_NS) a[k] = e[k];
};

/**
 * iOS's known upstream gaps (verify/VERIFY.md), applied to one matched span pair: opentelemetry-swift's OTLP encoder
 * never writes span flags, span traceState, link flags, link traceState or the scope schemaUrl, and its times are
 * rounded to the `Date` grid. Everything else must match exactly.
 */
function iosView(e: any, a: any): [any, any] {
  e = structuredClone(e);
  a = structuredClone(a);
  delete e.flags;
  delete e.traceState;
  delete e.scopeSchemaUrl;
  for (const l of e.links ?? []) {
    delete l.flags;
    delete l.traceState;
  }
  for (const k of TIME_KEYS) snapTime(e, a, k);
  (e.events ?? []).forEach((ev: any, i: number) => snapTime(ev, a.events?.[i], 'timeUnixNano'));
  return [e, a];
}

export function diffOtlp(expected: OtlpJson, actual: OtlpJson, platform?: Platform): Diff[] {
  const e = spansOf(expected);
  const a = spansOf(actual);
  const out: Diff[] = [];
  for (const id of new Set([...e.keys(), ...a.keys()])) {
    let [x, y] = [e.get(id), a.get(id)];
    const spanName = (x ?? y).name;
    if (!x || !y) {
      out.push({spanId: id, spanName, path: 'span', expected: x ? 'present' : undefined, actual: y ? 'present' : undefined});
      continue;
    }
    if (platform === 'ios') [x, y] = iosView(x, y);
    for (const d of diffValues(x, y)) out.push({spanId: id, spanName, ...d});
  }
  return out;
}

const show = (v: unknown) => (v === undefined ? '(none)' : JSON.stringify(v));

export function formatReport(scenario: string, platform: Platform, diffs: Diff[], expectedFile = rel('expected', scenario, 'otlp.json')): string {
  const lines: string[] = [];
  let last: string | undefined | null = null;
  for (const d of diffs) {
    if (d.spanId !== last) {
      lines.push(`✗ ${scenario} [${platform}]` + (d.spanId ? `  span ${d.spanId} "${d.spanName}"` : ''));
      last = d.spanId;
    }
    lines.push(`    ${d.path}  expected ${show(d.expected)}  got ${show(d.actual)}`);
  }
  lines.push(
    `  expected: ${expectedFile}`,
    `  actual:   ${rel('artifacts', scenario, `${platform}.otlp.json`)}`,
    `  scenario: verify/scenarios/${scenario}.ts`,
  );
  return lines.join('\n');
}

const write = (f: string, o: unknown) => {
  fs.mkdirSync(path.dirname(f), {recursive: true});
  fs.writeFileSync(f, JSON.stringify(o, null, 2) + '\n');
};

/**
 * Compares `actual` to the scenario's one expected file. `VERIFY_UPDATE=1` rewrites it; `draft` (e2e only,
 * `VERIFY_E2E_DRAFT=1`) writes a missing one and still fails, so a draft never passes unreviewed. iOS never writes the
 * shared file: its times are rounded, so its output is not the reference.
 */
export function compareToExpected(
  scenario: string,
  platform: Platform,
  actual: OtlpJson,
  {draft = false}: {draft?: boolean} = {},
): {ok: boolean; report: string} {
  const f = expectedPath(scenario);
  const fail = (diffs: Diff[]) => {
    write(abs('artifacts', scenario, `${platform}.otlp.json`), actual);
    return {ok: false, report: formatReport(scenario, platform, diffs)};
  };
  const writes = platform !== 'ios';
  if (process.env.VERIFY_UPDATE === '1' && writes) {
    write(f, actual);
    return {ok: true, report: `updated ${f}`};
  }
  if (!fs.existsSync(f)) {
    if (!draft || !writes) return fail([{path: 'file', expected: f, actual: undefined}]);
    write(f, actual);
    return {ok: false, report: `drafted ${rel('expected', scenario, 'otlp.json')}, review it`};
  }
  const diffs = diffOtlp(JSON.parse(fs.readFileSync(f, 'utf8')), actual, platform);
  return diffs.length ? fail(diffs) : {ok: true, report: ''};
}
