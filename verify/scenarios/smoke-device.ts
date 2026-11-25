import {scenario} from '../harness/scenario';

/**
 * Device smoke (§9.1, Task 29): production pipeline, test mode off, on every mobile target. Spans named
 * `smoke` arrive; only count and names are asserted (ids, times and the real resource are not deterministic).
 */
export default scenario(
  'smoke-device',
  async ({tracer}) => {
    tracer.startSpan('smoke').end();
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
