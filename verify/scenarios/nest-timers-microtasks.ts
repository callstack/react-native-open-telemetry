import {scenario} from '../harness/scenario';

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
      await inCallback(cb => (typeof setImmediate === 'function' ? setImmediate(cb) : setTimeout(cb, 0)), 'immediate', 20);
      await inCallback(cb => queueMicrotask(cb), 'microtask', 30);
      await inCallback(cb => setTimeout(() => queueMicrotask(cb), 0), 'timeout.microtask', 40);
      root.end(at(50));
      await inCallback(cb => setTimeout(cb, 0), 'after.end', 60);
    });
  },
);
