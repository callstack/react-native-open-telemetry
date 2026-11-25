import {expect} from 'e2e';
import {MOBILE, test} from './harness';

// Device smoke (§9.4, R20): the production pipeline, test mode off (native and JS), exports the `smoke` span.
// Count and names only: ids, times and the real resource (telemetry.*) are not deterministic, so no expected file.
// Needs a test-mode-off build: E2E_SMOKE=1 runs only this file (verify/stages/e2e.ts); VERIFY.md has the builds.
test('smoke-device', {platforms: MOBILE}, async ({app, screen, collector, target}) => {
  test.skip(process.env.E2E_SMOKE !== '1', 'needs a test-mode-off build (E2E_SMOKE=1)');
  await app.restart();
  // a test-mode build (native flag, or a stale bundle with the JS flag inlined) would not prove the production path
  await expect(screen.getByTestId('native-test-mode')).toHaveText('native testMode=false', {timeout: 30_000});
  await expect(screen.getByTestId('flush')).not.toBeVisible();
  collector.begin('smoke-device', target);
  let out;
  try {
    await screen.getByTestId('scenario-smoke-device').tap();
    await expect(screen.getByTestId('scenario-done')).toBeVisible({timeout: 30_000});
  } finally {
    out = await collector.end();
  }
  const names = (out.resourceSpans ?? []).flatMap(r => r.scopeSpans.flatMap((s: any) => s.spans.map((x: any) => x.name)));
  expect(names).toEqual(['smoke']);
});
