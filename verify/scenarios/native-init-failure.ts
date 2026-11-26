import {scenario} from '../harness/scenario';

/**
 * Native init failure (§4, §9.4): a build whose `exportUrl` is `not a url`. The SDK logs exactly one
 * error, the app keeps running on a no-op SDK, `forceFlush()` resolves, and no span is exported.
 */
export default scenario(
  'native-init-failure',
  async ({tracer, at}) => {
    tracer.startSpan('dropped', {startTime: at(0)}).end(at(10));
  },
  // bare only: the bad URL goes to the bare example's native init; the Expo app has none (it inits from JS)
  {runners: ['e2e'], targets: ['android-bare', 'ios-bare']},
);
