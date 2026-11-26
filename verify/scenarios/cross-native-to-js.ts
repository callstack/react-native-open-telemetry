import {context, trace} from '@opentelemetry/api';
import {scenario} from '../harness/scenario';

export default scenario(
  'cross-native-to-js',
  async ({tracer, at, native}) => {
    if (!native) throw new Error('cross-native-to-js needs ctx.native (TestNative)');
    const [, traceId = '', spanId = '', flags = ''] = native.doWork('', at(0), at(100)).split('-');
    const b = trace.wrapSpanContext({traceId, spanId, traceFlags: parseInt(flags, 16), isRemote: false});
    context.with(trace.setSpan(context.active(), b), () =>
      tracer.startSpan('js.after_native', {startTime: at(200)}).end(at(300)),
    );
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
