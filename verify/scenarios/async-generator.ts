import {scenario} from '../harness/scenario';

/** Async generator bodies and the `for await` loop consuming them stay children of the active span (§6.1). */
export default scenario(
  'async-generator',
  async ({tracer, at}) => {
    async function* gen() {
      for (let i = 0; i < 2; i++) {
        await Promise.resolve();
        tracer.startSpan(`gen.${i}`, {startTime: at(10 + i * 20)}).end(at(11 + i * 20));
        yield i;
      }
    }
    await tracer.startActiveSpan('root', {startTime: at(0)}, async root => {
      for await (const i of gen()) tracer.startSpan(`loop.${i}`, {startTime: at(20 + i * 20)}).end(at(21 + i * 20));
      root.end(at(60));
    });
  },
);
