import type {Attributes} from '@opentelemetry/api';
import type {ReadableSpan} from '@opentelemetry/sdk-trace';
import type {AttrValue, SeamAttribute, SeamSpan, SeamSpanContext} from '../native/Otel.nitro';

// Insertion order, only `undefined` dropped; sdk-trace already decided what else survives.
const attrs = (a: Attributes | undefined): SeamAttribute[] =>
  Object.entries(a ?? {}).flatMap(([key, v]) => (v === undefined ? [] : [{key, value: v as AttrValue}]));

const ctxOf = (c: {traceId: string; spanId: string; traceFlags: number; traceState?: {serialize(): string}}): SeamSpanContext => {
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
