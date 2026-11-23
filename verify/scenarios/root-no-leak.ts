import {scenario} from '../harness/scenario';

/**
 * Once a span's async work is done, nothing after it inherits that span: work at ROOT starts new roots,
 * including callbacks registered at ROOT that take the unwrapped fast path (§6.1 ROOT fast path).
 */
export default scenario(
  'root-no-leak',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('scoped', {startTime: at(0)}, async span => {
      await Promise.resolve();
      tracer.startSpan('scoped.child', {startTime: at(10)}).end(at(11));
      span.end(at(20));
    });
    tracer.startSpan('after.sync', {startTime: at(30)}).end(at(31));
    await Promise.resolve();
    tracer.startSpan('after.await', {startTime: at(40)}).end(at(41));
    await new Promise<void>(r => setTimeout(r, 0));
    tracer.startSpan('after.timeout', {startTime: at(50)}).end(at(51));
  },
);
