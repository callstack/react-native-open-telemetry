import type {Attributes, Tracer} from '@opentelemetry/api';

export const DEGRADED_ATTR = 'com.callstack.context.degraded';

let degraded = false;
// ponytail: one entry per tracer; tracers are few and long-lived
const stamped = new Map<{attributes?: Attributes}, Attributes>();

/** Scope attributes every SDK tracer carries: the degraded flag once the startup probe has failed (§6.1.4). */
export const scopeAttributes = (): Attributes => (degraded ? {[DEGRADED_ATTR]: true} : {});

/** Called by the probe on failure; tracers stamped earlier get the flag too. */
export function markDegraded(): void {
  degraded = true;
  for (const [scope, extra] of stamped) scope.attributes = {...extra, ...scopeAttributes()};
}

/**
 * sdk-trace 3.1 has no API for scope attributes, but its OTLP exporter and our seam read them off
 * `tracer.instrumentationScope` at runtime. Every tracer the SDK hands out goes through here (mobile and web).
 */
export function stampScope<T extends Tracer>(tracer: T, extra: Attributes = {}): T {
  const scope = (tracer as unknown as {instrumentationScope: {attributes?: Attributes}}).instrumentationScope;
  stamped.set(scope, extra);
  scope.attributes = {...extra, ...scopeAttributes()};
  return tracer;
}
