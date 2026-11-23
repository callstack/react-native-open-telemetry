import {scenario} from '../harness/scenario';

/**
 * Documented exception (§6.2): a shared queue flushed once runs everyone's work in the context of the first
 * enqueuer. `h2.work` is recorded under `h1` (the spike's `h_batching`); this file pins that wrong parent.
 */
export default scenario(
  'batching-shared-queue',
  async ({tracer, at}) => {
    const queue: (() => void)[] = [];
    let flushed!: () => void;
    const done = new Promise<void>(r => (flushed = r));
    const enqueue = (fn: () => void) => {
      queue.push(fn);
      if (queue.length === 1)
        setTimeout(() => {
          queue.splice(0).forEach(f => f());
          flushed();
        }, 0);
    };
    tracer.startActiveSpan('h1', {startTime: at(0)}, h1 => {
      enqueue(() => tracer.startSpan('h1.work', {startTime: at(10)}).end(at(11)));
      h1.end(at(1));
    });
    tracer.startActiveSpan('h2', {startTime: at(2)}, h2 => {
      enqueue(() => tracer.startSpan('h2.work', {startTime: at(20)}).end(at(21)));
      h2.end(at(3));
    });
    await done;
  },
  {pending: true}, // Task 10
);
