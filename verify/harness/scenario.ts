import type {HrTime, Tracer} from '@opentelemetry/api';

// TestNative (ctx.native) arrives with Task 26.
export type ScenarioCtx = {tracer: Tracer; at(us: number): HrTime};
export type Runner = 'jest' | 'e2e';
export type Scenario = {
  name: string;
  run: (ctx: ScenarioCtx) => Promise<void>;
  runners: Runner[];
  pending: boolean;
};

const BASE_S = 1767225600; // 2026-01-01T00:00:00Z

export const at = (us: number): HrTime => [BASE_S + Math.floor(us / 1e6), (us % 1e6) * 1000];

export const scenario = (
  name: string,
  run: Scenario['run'],
  opts: {runners?: Runner[]; pending?: boolean} = {},
): Scenario => ({name, run, runners: opts.runners ?? ['jest', 'e2e'], pending: !!opts.pending});
