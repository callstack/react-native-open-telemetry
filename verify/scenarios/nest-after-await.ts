import {scenario} from '../harness/scenario';

export default scenario(
  'nest-after-await',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('parent', {startTime: at(0)}, async parent => {
      await Promise.resolve();
      tracer.startSpan('child', {startTime: at(10)}).end(at(20));
      parent.end(at(30));
    });
  },
);
