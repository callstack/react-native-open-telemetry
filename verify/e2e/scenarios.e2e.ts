import {expectScenario, test} from './harness';

test('smoke-js', async ({app, screen, collector, target}) => {
  await expectScenario('smoke-js', target, {app, screen, collector});
});
