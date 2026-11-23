import {scenario} from '../harness/scenario';

/**
 * When the startup probe finds that context does not survive `await` (native async, §6.1.4), the JS tracers'
 * scope carries `com.callstack.context.degraded=true` and spans after `await` are roots, never wrongly parented.
 * Runs only in the Jest project that keeps native `async` (Task 11). Task 11 must hand this scenario a tracer
 * from the SDK path, so the scope attribute can appear: a bare harness `TracerProvider` cannot carry it.
 */
export default scenario(
  'degraded-probe',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('parent', {startTime: at(0)}, async parent => {
      await Promise.resolve();
      tracer.startSpan('after_await', {startTime: at(10)}).end(at(11));
      parent.end(at(20));
    });
  },
  {runners: ['jest-degraded']},
);
