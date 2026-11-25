import {expect} from 'e2e';
import {expectScenario, MOBILE, tapFlush, test} from './harness';

// forceFlush() across a JS reload (§9.4): the span handed off before the reload is still queued in native (JS keeps
// no buffer); after the reload a new JS SDK attaches and its forceFlush() resolves within 5 s and sends it exactly once.
// Test mode has no timed export (scheduleDelay 120 s), so only that flush can have sent it.
test('flush-after-reload', {platforms: MOBILE}, async ({app, screen, collector, target}) => {
  await expectScenario('flush-after-reload', target, {app, screen, collector}, {
    afterDone: async () => {
      await screen.getByTestId('reload').tap(); // native reload (TestNative), test-mode builds only
      // the reloaded JS app starts over: the done marker is gone
      await expect(screen.getByTestId('scenario-done')).toBeHidden({timeout: 15_000});
      await tapFlush(screen, 1, 5_000);
    },
  });
});
