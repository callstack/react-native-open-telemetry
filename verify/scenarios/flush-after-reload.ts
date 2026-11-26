import {scenario} from '../harness/scenario';

export default scenario(
  'flush-after-reload',
  async ({tracer, at}) => {
    tracer.startSpan('before_reload', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
