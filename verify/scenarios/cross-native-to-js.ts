import {context, trace} from '@opentelemetry/api';
import {scenario} from '../harness/scenario';

/**
 * A JS span started under a native span's context is its child (Task 26).
 * Steps: at ROOT, `ctx.native.doWork('', …)` starts and ends root `native.work` and returns its traceparent →
 * JS starts `js.after_native` under `trace.wrapSpanContext(<that context>)` (non-remote, spec §4.3).
 * Proof: one trace, `js.after_native` has `native.work` as parent.
 */
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
