import {scenario} from '../harness/scenario';

/**
 * A callback that throws still restores the previous context (wrappers restore in `finally`, §6.1):
 * its `.catch` stays a child, and the next job registered at ROOT runs at ROOT.
 */
export default scenario(
  'error-in-callback',
  async ({tracer, at}) => {
    const {parent, caught} = tracer.startActiveSpan('parent', {startTime: at(0)}, parent => {
      const failed = Promise.resolve().then(() => {
        tracer.startSpan('throws', {startTime: at(10)}).end(at(11));
        throw new Error('boom');
      });
      return {parent, caught: failed.catch(() => tracer.startSpan('caught', {startTime: at(20)}).end(at(21)))};
    });
    // registered at ROOT, runs right after the throwing callback
    const next = Promise.resolve().then(() => tracer.startSpan('root.next', {startTime: at(30)}).end(at(31)));
    await Promise.all([caught, next]);
    parent.end(at(40));
  },
  {pending: true}, // Task 10
);
