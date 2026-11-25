import type {HrTime, Tracer, TracerOptions} from '@opentelemetry/api';

/** The example app's TestNative HybridObject (Task 26): app native code using the public `RNOtel` helpers.
 * Mirrors example/modules/test-native/src/TestNative.nitro.ts by hand, so the harness needs no Nitro import. */
export interface TestNative {
  /** Starts and ends native `native.work` under `traceparent` ('' = a root), returns its traceparent. */
  doWork(traceparent: string, start: HrTime, end: HrTime): string;
}

export type ScenarioCtx = {
  tracer: Tracer;
  /** Extra tracers, for scenarios that need their own scope (version, schemaUrl). */
  getTracer(name: string, version?: string, options?: TracerOptions): Tracer;
  at(us: number): HrTime;
  /** Only on devices (the example app); e2e-only scenarios use it. */
  native?: TestNative;
};
/** `jest`: Jest compares the JS output to `<name>.js.otlp.json`. `e2e`: the example apps on devices and web. */
export type Runner = 'jest' | 'e2e';
/** A platform, or one e2e target (`android-bare`, `ios-expo`, …) for what only one app can run. */
export type Target = 'android' | 'ios' | 'web' | `${'android' | 'ios'}-${'bare' | 'expo'}`;
export type Scenario = {
  name: string;
  run: (ctx: ScenarioCtx) => Promise<void>;
  runners: Runner[];
  /** e2e targets it runs on: platforms or target names. */
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
