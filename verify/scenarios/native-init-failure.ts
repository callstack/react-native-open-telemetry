import {scenario} from '../harness/scenario';

/**
 * Native init failure (§4, §9.4, Task 27): a build whose `exportUrl` is `not a url`. The SDK logs exactly one
 * error, the app keeps running on a no-op SDK, `forceFlush()` resolves, and no span is exported.
 */
export default scenario(
  'native-init-failure',
  async ({tracer, at}) => {
    tracer.startSpan('dropped', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios'], pending: true},
);
