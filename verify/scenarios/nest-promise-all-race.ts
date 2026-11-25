import {scenario} from '../harness/scenario';

/** Branches of Promise.all and Promise.race, and the code after them, stay children of the active span (§6.1). */
export default scenario(
  'nest-promise-all-race',
  async ({tracer, at}) => {
    const step = async (name: string, t: number) => {
      await Promise.resolve();
      tracer.startSpan(name, {startTime: at(t)}).end(at(t + 1));
    };
    await tracer.startActiveSpan('root', {startTime: at(0)}, async root => {
      await Promise.all([step('all.a', 10), step('all.b', 20)]);
      // race.b takes as many ticks as race.a, so it ends before `after` and before the export
      await Promise.race([step('race.a', 30), step('race.b', 40)]);
      tracer.startSpan('after', {startTime: at(50)}).end(at(51));
      root.end(at(60));
    });
  },
);
