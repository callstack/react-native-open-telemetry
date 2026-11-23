import {scenario} from '../harness/scenario';

/**
 * A native span started from JS is a child of the active JS span (Task 26).
 * Steps: JS span `js.parent` active → `ctx.native.doWork(traceparent, start, end)` starts and ends native
 * `native.work` with `contextFrom(traceparent)` as parent. Proof: one trace, `native.work` (a `0b…` id)
 * has `js.parent` as parent. Body lands with `ScenarioCtx.native`.
 */
export default scenario('cross-js-to-native', async () => {}, {runners: ['e2e'], targets: ['android', 'ios'], pending: true});
