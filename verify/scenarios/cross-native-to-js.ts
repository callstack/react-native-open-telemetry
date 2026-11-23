import {scenario} from '../harness/scenario';

/**
 * A JS span started under a native span's context is its child (Task 26).
 * Steps: at ROOT, `ctx.native.doWork(...)` starts and ends root `native.work` and returns its traceparent →
 * JS starts `js.after_native` under `trace.wrapSpanContext(<that context>)`. Proof: one trace,
 * `js.after_native` has `native.work` as parent. Body lands with `ScenarioCtx.native`.
 */
export default scenario('cross-native-to-js', async () => {}, {runners: ['e2e'], targets: ['android', 'ios'], pending: true});
