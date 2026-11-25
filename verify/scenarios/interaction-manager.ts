import {scenario} from '../harness/scenario';

/**
 * The span active when `InteractionManager.runAfterInteractions` is called parents the span started in its callback (Hermes).
 * Assumes no ROOT `runAfterInteractions` is already queued: InteractionManager is a shared queue (§6.2), so with an
 * earlier enqueuer the callback would run in that enqueuer's context.
 */
export default scenario(
  'interaction-manager',
  async ({tracer, at}) => {
    // lazy: the module list is also loaded by Jest, which has no react-native runtime
    const {InteractionManager} = require('react-native') as typeof import('react-native');
    await tracer.startActiveSpan('parent', {startTime: at(0)}, async parent => {
      await new Promise<void>(done =>
        InteractionManager.runAfterInteractions(() => {
          tracer.startSpan('after_interactions', {startTime: at(10)}).end(at(11));
          done();
        }),
      );
      parent.end(at(20));
    });
  },
  // RN 0.88 (the example) removed InteractionManager from core (dev: invariant; release: undefined). Kept pending until
  // an example on an RN that still ships it exists; the RN replacement, requestIdleCallback, is not in the §6.1 patch list.
  {runners: ['e2e'], pending: true},
);
