import {scenario} from '../harness/scenario';

export default scenario('handoff-basic', async ({tracer, at}) => {
  const root = tracer.startSpan('root', {startTime: at(0), attributes: {'app.step': 'one'}});
  root.end(at(100));
}, {runners: ['seam', 'e2e']});
