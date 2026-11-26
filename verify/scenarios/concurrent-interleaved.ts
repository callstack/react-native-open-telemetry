import {scenario} from '../harness/scenario';

export default scenario(
  'concurrent-interleaved',
  async ({tracer, at}) => {
    const tick = () => new Promise<void>(r => setTimeout(r, 0));
    const job = (name: string, t: number) =>
      tracer.startActiveSpan(name, {startTime: at(t)}, async span => {
        await Promise.resolve();
        tracer.startSpan(`${name}.1`, {startTime: at(t + 10)}).end(at(t + 11));
        await tick();
        tracer.startSpan(`${name}.2`, {startTime: at(t + 20)}).end(at(t + 21));
        span.end(at(t + 30));
      });
    await Promise.all([job('a', 0), job('b', 1)]);
    tracer.startSpan('after.all', {startTime: at(40)}).end(at(41));
  },
);
