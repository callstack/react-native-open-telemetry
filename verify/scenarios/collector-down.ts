import {scenario} from '../harness/scenario';

export default scenario(
  'collector-down',
  async ({tracer, at}) => {
    tracer.startSpan('work', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e']},
);
