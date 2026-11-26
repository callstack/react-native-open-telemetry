import {scenario} from '../harness/scenario';

export default scenario(
  'export-headers',
  async ({tracer, at}) => {
    tracer.startSpan('headers', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios', 'web']},
);
