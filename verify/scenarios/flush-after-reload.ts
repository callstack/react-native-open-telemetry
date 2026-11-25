import {scenario} from '../harness/scenario';

/**
 * `flush()` across a JS reload (§9.4, Task 27): run this, reload JS, call `forceFlush()`. It resolves within
 * 5 s without blocking the main thread, and the span arrives exactly once.
 */
export default scenario(
  'flush-after-reload',
  async ({tracer, at}) => {
    tracer.startSpan('before_reload', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
