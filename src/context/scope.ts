import type {Attributes, Tracer} from '@opentelemetry/api';

export const DEGRADED_ATTR = 'com.callstack.context.degraded';

let degraded = false;
const stamped = new Map<{attributes?: Attributes}, Attributes>();

export const scopeAttributes = (): Attributes => (degraded ? {[DEGRADED_ATTR]: true} : {});

export function markDegraded(): boolean {
  if (degraded) return false;
  degraded = true;
  for (const [scope, extra] of stamped) scope.attributes = {...extra, ...scopeAttributes()};
  return true;
}

export function stampScope<T extends Tracer>(tracer: T, extra: Attributes = {}): T {
  const scope = (tracer as unknown as {instrumentationScope?: {attributes?: Attributes}}).instrumentationScope;
  if (typeof scope !== 'object' || scope === null) return tracer;
  const merged = {...stamped.get(scope), ...extra};
  stamped.set(scope, merged);
  scope.attributes = {...merged, ...scopeAttributes()};
  return tracer;
}
