import {scenario} from '../harness/scenario';

export default scenario(
  'smoke-js',
  async ({tracer, at}) => {
    tracer.startSpan('smoke', {startTime: at(0)}).end(at(1));
  },
  {runners: ['jest']},
);
