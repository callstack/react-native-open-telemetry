import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {expectScenario, MOBILE, test} from './harness';

// The module withOtel runs before the app: it installs the patch on every evaluation.
const SETUP = path.join(import.meta.dirname, '..', '..', 'lib', 'module', 'setup.js');

// Fast refresh does not stack the context patch (§6.1.3, §9.4). Dev builds + Metro only (E2E_DEV=1, `*-dev` targets).
// Each edit of setup.js makes Metro hot-update it, so it re-evaluates and runs installContextPatch again; the edit
// counts re-evaluations in `__otelRefreshes`. `patch-identity` compares `then`/`setTimeout` with their first values.
test('fast-refresh-idempotent', {platforms: MOBILE}, async ({app, screen, collector, target}) => {
  test.skip(!target.endsWith('-dev'), 'needs a dev build and Metro (E2E_DEV=1)');
  const original = fs.readFileSync(SETUP, 'utf8');
  try {
    await app.restart();
    await expect(screen.getByTestId('patch-identity')).toHaveText('same refreshes=0', {timeout: 60_000});
    for (const n of [1, 2]) {
      fs.writeFileSync(SETUP, `${original}\nglobalThis.__otelRefreshes = (globalThis.__otelRefreshes ?? 0) + 1; // refresh ${n}\n`);
      // `same` with the count: a hot update (a full reload would reset the count) and no stacked wrappers
      await expect(screen.getByTestId('patch-identity')).toHaveText(`same refreshes=${n}`, {timeout: 30_000});
    }
    // and the nesting still holds: the same output as nest-after-await's expected file
    await expectScenario('nest-after-await', target, {app, screen, collector}, {launch: async () => {}});
  } finally {
    fs.writeFileSync(SETUP, original);
  }
});
