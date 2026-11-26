import {scenario} from '../harness/scenario';

export default scenario(
  'nest-raf',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('root', {startTime: at(0)}, async root => {
      await new Promise<void>(done =>
        requestAnimationFrame(() => {
          tracer.startSpan('frame', {startTime: at(10)}).end(at(11));
          done();
        }),
      );
      root.end(at(20));
    });
  },
  {runners: ['e2e']}
);
