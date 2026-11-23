import {scenario} from '../harness/scenario';

/**
 * Callbacks of setTimeout, setImmediate and queueMicrotask run in the context they were scheduled in (§6.1).
 * requestAnimationFrame is patched too but missing in Node, so it is left out to keep one shape for every runner.
 */
export default scenario(
  'nest-timers-microtasks',
  async ({tracer, at}) => {
    await tracer.startActiveSpan('root', {startTime: at(0)}, async root => {
      const inCallback = (schedule: (cb: () => void) => void, name: string, t: number) =>
        new Promise<void>(done =>
          schedule(() => {
            tracer.startSpan(name, {startTime: at(t)}).end(at(t + 1));
            done();
          }),
        );
      await inCallback(cb => setTimeout(cb, 0), 'timeout', 10);
      await inCallback(cb => setImmediate(cb), 'immediate', 20);
      await inCallback(cb => queueMicrotask(cb), 'microtask', 30);
      // scheduled from inside a callback: the context is carried twice
      await inCallback(cb => setTimeout(() => queueMicrotask(cb), 0), 'timeout.microtask', 40);
      root.end(at(50));
    });
  },
  {pending: true}, // Task 10
);
