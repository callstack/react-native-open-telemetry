import {scenario} from '../harness/scenario';

/**
 * A native span started from JS is a child of the active JS span.
 * Steps: JS span `js.parent` active → `ctx.native.doWork(traceparent, start, end)` starts and ends native
 * `native.work` with `contextFrom(traceparent)` as parent. Proof: one trace, `native.work` (a `0b…` id)
 * has `js.parent` as parent.
 */
export default scenario(
  'cross-js-to-native',
  async ({tracer, at, native}) => {
    if (!native) throw new Error('cross-js-to-native needs ctx.native (TestNative)');
    tracer.startActiveSpan('js.parent', {startTime: at(0)}, span => {
      const {traceId, spanId, traceFlags} = span.spanContext();
      native.doWork(`00-${traceId}-${spanId}-${traceFlags.toString(16).padStart(2, '0')}`, at(100), at(200));
      span.end(at(300));
    });
  },
  {runners: ['e2e'], targets: ['android', 'ios']},
);
