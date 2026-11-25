import {scenario} from '../harness/scenario';

/** A span started after `await` is a child of the span active before it (§6.1). */
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
