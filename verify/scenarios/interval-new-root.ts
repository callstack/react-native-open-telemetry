import {scenario} from '../harness/scenario';

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
