import {scenario} from '../harness/scenario';

/**
 * Documented exception (§6.2): `setInterval` ticks run in ROOT_CONTEXT, so a poller started inside a tap
 * starts a new root per tick instead of attaching to the tap. Work after `await` in the tap stays its child.
 */
export default scenario(
  'interval-new-root',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('tap', {startTime: at(0)}, async tap => {
      await new Promise<void>(done => {
        let n = 0;
        const id = setInterval(() => {
          n++;
          tracer.startSpan('tick', {startTime: at(n * 100)}).end(at(n * 100 + 1));
          if (n === 2) {
            clearInterval(id);
            done();
          }
        }, 1);
      });
      tracer.startSpan('load', {startTime: at(300)}).end(at(301));
      tap.end(at(400));
    });
  },
);
