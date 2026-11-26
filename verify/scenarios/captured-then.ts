import {scenario} from '../harness/scenario';

export default scenario(
  'captured-then',
  async ({tracer, at}) => {
    const original: typeof Promise.prototype.then = (globalThis as any)[Symbol.for('com.callstack.otel.patched')].then;
    await tracer.startActiveSpan('parent', {startTime: at(0)}, async parent => {
      await Promise.resolve().then(() => tracer.startSpan('kept', {startTime: at(10)}).end(at(11)));
      await original.call(Promise.resolve(), () => tracer.startSpan('lost', {startTime: at(20)}).end(at(21)));
      parent.end(at(30));
    });
  },
);
