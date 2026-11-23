import type {HrTime, Tracer, TracerOptions} from '@opentelemetry/api';

// TestNative (ctx.native) arrives with Task 26.
export type ScenarioCtx = {
  tracer: Tracer;
  /** Extra tracers, for scenarios that need their own scope (version, schemaUrl). */
  getTracer(name: string, version?: string, options?: TracerOptions): Tracer;
  at(us: number): HrTime;
};
/** `jest-degraded`: the Jest project that keeps native `async` (Task 11). */
export type Runner = 'jest' | 'jest-degraded' | 'e2e';
export type Target = 'android' | 'ios' | 'web';
export type Scenario = {
  name: string;
  run: (ctx: ScenarioCtx) => Promise<void>;
  runners: Runner[];
  /** e2e targets it runs on. */
  targets: Target[];
  pending: boolean;
};

const BASE_S = 1767225600; // 2026-01-01T00:00:00Z

export const at = (us: number): HrTime => [BASE_S + Math.floor(us / 1e6), (us % 1e6) * 1000];

export const scenario = (
  name: string,
  run: Scenario['run'],
  opts: {runners?: Runner[]; targets?: Target[]; pending?: boolean} = {},
): Scenario => ({
  name,
  run,
  runners: opts.runners ?? ['jest', 'e2e'],
  targets: opts.targets ?? ['android', 'ios', 'web'],
  pending: !!opts.pending,
});
