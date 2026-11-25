import type {Attributes, SpanContext} from '@opentelemetry/api';
import type {ReadableSpan} from '@opentelemetry/sdk-trace';
import type {AttrValue, SeamAttribute, SeamSpan, SeamSpanContext} from '../native/Otel.nitro';

const PRIMS = ['string', 'number', 'boolean'];
// Seam-representable: a primitive, or a homogeneous array of one primitive type, no nulls (empty is fine).
const seamValue = (v: unknown): v is AttrValue =>
  PRIMS.includes(typeof v) ||
  (Array.isArray(v) && v.every(x => PRIMS.includes(typeof x) && typeof x === typeof v[0]));

// Insertion order; anything the seam cannot carry (null, undefined, objects, bytes, mixed arrays) is dropped.
export const attrs = (a: Attributes | undefined): SeamAttribute[] => {
  const out: SeamAttribute[] = [];
  for (const key in a) {
    const value: unknown = a[key];
    if (seamValue(value)) out.push({key, value});
  }
  return out;
};

const ctxOf = (c: SpanContext): SeamSpanContext => {
  const traceState = c.traceState?.serialize();
  return {traceId: c.traceId, spanId: c.spanId, traceFlags: c.traceFlags, ...(traceState ? {traceState} : {})};
};

export function toSeamSpan(span: ReadableSpan): SeamSpan {
  const parent = span.parentSpanContext?.spanId;
  const {version, schemaUrl} = span.instrumentationScope;
  // sdk-trace 3.1's InstrumentationScope type has no attributes, but exporters read them at runtime.
  const scopeAttrs = (span.instrumentationScope as {attributes?: Attributes}).attributes;
  return {
    context: ctxOf(span.spanContext()),
    ...(parent ? {parentSpanId: parent} : {}),
    name: span.name,
    kind: span.kind,
    start: span.startTime,
    end: span.endTime,
    attributes: attrs(span.attributes),
    events: span.events.map(e => ({name: e.name, time: e.time, attributes: attrs(e.attributes)})),
    links: span.links.map(l => ({context: ctxOf(l.context), attributes: attrs(l.attributes)})),
    status: {code: span.status.code, ...(span.status.message ? {message: span.status.message} : {})},
    scope: {
      name: span.instrumentationScope.name,
      ...(version ? {version} : {}),
      ...(schemaUrl ? {schemaUrl} : {}),
      attributes: attrs(scopeAttrs),
    },
  };
}
