import type {HrTime, Tracer, TracerOptions} from '@opentelemetry/api';

export interface TestNative {
  doWork(traceparent: string, start: HrTime, end: HrTime): string;
}

export type ScenarioCtx = {
  tracer: Tracer;
  getTracer(name: string, version?: string, options?: TracerOptions): Tracer;
  at(us: number): HrTime;
  native?: TestNative;
};
export type Runner = 'jest' | 'e2e';
export type Target = 'android' | 'ios' | 'web' | `${'android' | 'ios'}-${'bare' | 'expo'}`;
export type Scenario = {
  name: string;
  run: (ctx: ScenarioCtx) => Promise<void>;
  runners: Runner[];
  targets: Target[];
  pending: boolean;
};

const BASE_S = 1767225600;

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
