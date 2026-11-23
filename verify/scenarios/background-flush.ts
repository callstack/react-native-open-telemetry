import {scenario} from '../harness/scenario';

/**
 * Background flush (§9.4, Task 27): run this and background the app immediately. The span arrives without
 * `forceFlush()`, exactly once; no ANR on Android.
 */
export default scenario(
  'background-flush',
  async ({tracer, at}) => {
    tracer.startSpan('before_background', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], pending: true},
);
