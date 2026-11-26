import {scenario} from '../harness/scenario';

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
    const next = Promise.resolve().then(() => tracer.startSpan('root.next', {startTime: at(30)}).end(at(31)));
    await Promise.all([caught, next]);
    parent.end(at(40));
  },
);
