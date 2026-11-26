import {scenario} from '../harness/scenario';

export default scenario(
  'background-flush',
  async ({tracer, at}) => {
    tracer.startSpan('before_background', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
