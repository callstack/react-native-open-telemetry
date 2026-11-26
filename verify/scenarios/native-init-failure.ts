import {scenario} from '../harness/scenario';

export default scenario(
  'native-init-failure',
  async ({tracer, at}) => {
    tracer.startSpan('dropped', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android-bare', 'ios-bare']},
);
