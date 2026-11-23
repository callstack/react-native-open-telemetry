import {scenario} from '../harness/scenario';

/** The span active when `InteractionManager.runAfterInteractions` is called parents the span started in its callback (Hermes). */
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
  {runners: ['e2e'], pending: true}, // Task 13
);
