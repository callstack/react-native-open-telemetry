import {scenario} from '../harness/scenario';

/**
 * Performance guardrail (§9.2, Task 29), `android-bare` only: (a) 1,000 spans × 10 attributes through the real
 * hand-off, p50/p95 µs per span; (b) 10,000 awaits with the patch on vs off. Fails only if hand-off p50 ≥ 100 µs
 * or the patch ratio ≥ 3×. Output is `verify/artifacts/perf.json`, not spans: no shape file.
 */
export default scenario('perf-budget', async () => {}, {runners: ['e2e'], pending: true});
