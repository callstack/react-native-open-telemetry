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
      // browsers have no setImmediate: there the step is one more setTimeout, so every runner keeps one shape
      await inCallback(cb => (typeof setImmediate === 'function' ? setImmediate(cb) : setTimeout(cb, 0)), 'immediate', 20);
      await inCallback(cb => queueMicrotask(cb), 'microtask', 30);
      // scheduled from inside a callback: the context is carried twice
      await inCallback(cb => setTimeout(() => queueMicrotask(cb), 0), 'timeout.microtask', 40);
      root.end(at(50));
      // a callback that runs after its parent ended is still its child (§6.2)
      await inCallback(cb => setTimeout(cb, 0), 'after.end', 60);
    });
  },
);
