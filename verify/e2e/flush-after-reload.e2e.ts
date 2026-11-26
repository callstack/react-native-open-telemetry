import {expect} from 'e2e';
import {expectScenario, MOBILE, tapFlush, test} from './harness';

test('flush-after-reload', {platforms: MOBILE}, async ({app, screen, collector, target}) => {
  await expectScenario('flush-after-reload', target, {app, screen, collector}, {
    afterDone: async () => {
      await screen.getByTestId('reload').tap();
      await expect(screen.getByTestId('scenario-done')).toBeHidden({timeout: 15_000});
      await tapFlush(screen, 1, 5_000);
    },
  });
});
