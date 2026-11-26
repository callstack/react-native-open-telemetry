import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {expectScenario, MOBILE, test} from './harness';

const SETUP = path.join(import.meta.dirname, '..', '..', 'lib', 'module', 'setup.js');

test('fast-refresh-idempotent', {platforms: MOBILE}, async ({app, screen, collector, target}) => {
  test.skip(!target.endsWith('-dev'), 'needs a dev build and Metro (E2E_DEV=1)');
  const original = fs.readFileSync(SETUP, 'utf8');
  try {
    await app.restart();
    await expect(screen.getByTestId('patch-identity')).toHaveText('same refreshes=0', {timeout: 60_000});
    for (const n of [1, 2]) {
      fs.writeFileSync(SETUP, `${original}\nglobalThis.__otelRefreshes = (globalThis.__otelRefreshes ?? 0) + 1; // refresh ${n}\n`);
      await expect(screen.getByTestId('patch-identity')).toHaveText(`same refreshes=${n}`, {timeout: 30_000});
    }
    await expectScenario('nest-after-await', target, {app, screen, collector}, {launch: async () => {}});
  } finally {
    fs.writeFileSync(SETUP, original);
  }
});
