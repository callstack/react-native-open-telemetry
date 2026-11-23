import type {OtlpJson} from './otlpJson';

// key-order independent: attributes sorted by key before comparing
const canon = (x: any) =>
  JSON.stringify(
    x && x.attributes
      ? {...x, attributes: [...x.attributes].sort((a: any, b: any) => cmp(a.key, b.key))}
      : x,
  );
const eq = (a: any, b: any) => canon(a) === canon(b);
const cmp = (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0);
const by = (f: (x: any) => any[]) => (a: any, b: any) => {
  const [x, y] = [f(a), f(b)];
  for (let i = 0; i < x.length; i++) {
    const c = cmp(x[i], y[i]);
    if (c) return c;
  }
  return 0;
};
const nano = (x: any) => BigInt(x.timeUnixNano ?? 0);

function sortSpan(s: any) {
  const o = {...s};
  if (o.attributes) o.attributes = [...o.attributes].sort(by(a => [a.key]));
  if (o.events)
    o.events = o.events
      .map((e: any) =>
        e.attributes
          ? {...e, attributes: [...e.attributes].sort(by(a => [a.key]))}
          : e,
      )
      .sort((a: any, b: any) => cmp(nano(a), nano(b)) || cmp(a.name, b.name));
  if (o.links)
    o.links = o.links
      .map((l: any) =>
        l.attributes
          ? {...l, attributes: [...l.attributes].sort(by(a => [a.key]))}
          : l,
      )
      .sort(by(l => [l.spanId]));
  return o;
}

/** Merge equal resources/scopes, sort for determinism. Values are never changed. */
export function normalize(requests: OtlpJson[]): OtlpJson {
  const resources: any[] = [];
  for (const req of requests)
    for (const rs of req.resourceSpans ?? []) {
      let r = resources.find(
        x => eq(x.resource, rs.resource) && x.schemaUrl === rs.schemaUrl,
      );
      if (!r) resources.push((r = {...rs, scopeSpans: []}));
      for (const ss of rs.scopeSpans ?? []) {
        let s = r.scopeSpans.find(
          (x: any) => eq(x.scope, ss.scope) && x.schemaUrl === ss.schemaUrl,
        );
        if (!s) r.scopeSpans.push((s = {...ss, spans: []}));
        s.spans.push(...(ss.spans ?? []));
      }
    }
  for (const r of resources) {
    if (r.resource?.attributes)
      r.resource = {
        ...r.resource,
        attributes: [...r.resource.attributes].sort(by(a => [a.key])),
      };
    for (const s of r.scopeSpans) {
      if (s.scope?.attributes)
        s.scope = {
          ...s.scope,
          attributes: [...s.scope.attributes].sort(by(a => [a.key])),
        };
      s.spans = s.spans.map(sortSpan).sort(by(x => [x.spanId]));
    }
  }
  return {resourceSpans: resources};
}
