import fs from 'fs';
import {diffValues, expectedPath, type Diff} from './compare';
import type {OtlpJson} from './otlpJson';

export type SpanShape = {
  name: string;
  kind: number;
  parent: string | null;
  status: number;
  links: string[];
  attributes: Record<string, string>;
};
export type Shape = {resource: string[]; scope: string[]; traces: SpanShape[][]};

const kindOf = (v: any = {}): string => {
  if ('arrayValue' in v) {
    const vals: any[] = v.arrayValue.values ?? [];
    return `array<${vals.length ? kindOf(vals[0]) : 'empty'}>`;
  }
  if ('kvlistValue' in v) return 'kvlist';
  if ('intValue' in v) return 'int';
  if ('doubleValue' in v) return 'double';
  if ('boolValue' in v) return 'bool';
  if ('bytesValue' in v) return 'bytes';
  return 'string';
};
// parent/link target not in this export: stable placeholder, never a platform-specific id
const EXTERNAL = '(external)';
const keys = (set: Set<string>) => [...set].sort();
const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);

/** Structure only: no ids, timestamps or values. */
export function shapeOf(otlp: OtlpJson): Shape {
  const resource = new Set<string>();
  const scope = new Set<string>();
  const spans: any[] = [];
  for (const rs of otlp.resourceSpans ?? []) {
    for (const a of rs.resource?.attributes ?? []) resource.add(a.key);
    for (const ss of rs.scopeSpans ?? []) {
      for (const a of ss.scope?.attributes ?? []) scope.add(a.key);
      spans.push(...(ss.spans ?? []));
    }
  }
  const name = new Map(spans.map(s => [s.spanId, s.name]));
  const chrono = [...spans].sort(
    (a, b) =>
      cmp(BigInt(a.startTimeUnixNano ?? 0), BigInt(b.startTimeUnixNano ?? 0)) ||
      cmp(a.spanId, b.spanId),
  );
  const traces = new Map<string, SpanShape[]>();
  for (const s of chrono) {
    const t = traces.get(s.traceId) ?? [];
    traces.set(s.traceId, t);
    t.push({
      name: s.name,
      kind: s.kind ?? 0,
      parent: s.parentSpanId ? (name.get(s.parentSpanId) ?? EXTERNAL) : null,
      status: s.status?.code ?? 0,
      links: (s.links ?? []).map((l: any) => name.get(l.spanId) ?? EXTERNAL),
      attributes: Object.fromEntries(
        (s.attributes ?? []).map((a: any) => [a.key, kindOf(a.value)]),
      ),
    });
  }
  return {
    resource: keys(resource),
    scope: keys(scope),
    traces: [...traces.values()].map(t => t.sort((a, b) => cmp(a.name, b.name))),
  };
}

export function compareShape(scenario: string, actual: OtlpJson): Diff[] {
  const f = expectedPath(scenario, 'shape');
  if (!fs.existsSync(f)) return [{path: 'shape.json', expected: f, actual: undefined}];
  return diffValues(JSON.parse(fs.readFileSync(f, 'utf8')), shapeOf(actual));
}
