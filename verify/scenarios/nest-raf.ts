import {scenario} from '../harness/scenario';

/** A `requestAnimationFrame` callback runs in the context it was scheduled in (§6.1). Node has no rAF: e2e only. */
export default scenario(
  'nest-raf',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('root', {startTime: at(0)}, async root => {
      await new Promise<void>(done =>
        requestAnimationFrame(() => {
          tracer.startSpan('frame', {startTime: at(10)}).end(at(11));
          done();
        }),
      );
      root.end(at(20));
    });
  },
  {runners: ['e2e'], pending: true}, // Task 13
);
