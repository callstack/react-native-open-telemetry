import {allScenarios, anyTarget, expectScenario} from './harness';

/** Scenarios with their own e2e file (they need more than tap-and-compare). */
const OWN_FILE = new Set([
  'collector-down',
  'native-init-failure',
  'flush-after-reload',
  'background-flush',
  'fast-refresh-idempotent',
  'export-headers',
]);

// expectScenario skips targets a scenario does not list
for (const s of allScenarios().filter(s => s.runners.includes('e2e') && !s.pending && !OWN_FILE.has(s.name))) {
  anyTarget(s.name, async ({app, screen, collector, target}) => {
    await expectScenario(s.name, target, {app, screen, collector});
  });
}
