import {scenario} from '../harness/scenario';

/**
 * Collector down (§9.4 failure scenarios, Task 27): the e2e test makes the collector `refuse(503, 3)`.
 * The app does not block or crash (`scenario-done` within 2 s) and, once the collector accepts again,
 * the span arrives exactly once.
 */
export default scenario(
  'collector-down',
  async ({tracer, at}) => {
    tracer.startSpan('work', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e']},
);
