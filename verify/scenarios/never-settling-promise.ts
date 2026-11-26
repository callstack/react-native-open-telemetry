import {scenario} from '../harness/scenario';

export default scenario(
  'never-settling-promise',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('parent', {startTime: at(0)}, async parent => {
      new Promise<void>(() => {}).then(() => tracer.startSpan('never', {startTime: at(5)}).end(at(6)));
      await Promise.resolve();
      tracer.startSpan('child', {startTime: at(10)}).end(at(11));
      parent.end(at(20));
    });
    await Promise.resolve();
    tracer.startSpan('later.await', {startTime: at(30)}).end(at(31));
    await new Promise<void>(r => setTimeout(r, 0));
    tracer.startSpan('later.timeout', {startTime: at(40)}).end(at(41));
  },
);
