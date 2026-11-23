import {context, trace} from '@opentelemetry/api';
import {scenario} from '../harness/scenario';

// Task 10 replaces this body with the real context-propagation version; names and structure must stay.
export default scenario('nest-after-await', async ({tracer, at}) => {
  const parent = tracer.startSpan('parent', {startTime: at(0)});
  await Promise.resolve();
  tracer.startSpan('child', {startTime: at(10)}, trace.setSpan(context.active(), parent)).end(at(20));
  parent.end(at(30));
});
