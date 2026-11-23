import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {clearDeviceLog, deviceLog, platformOf, test} from './harness';
import {decodeFixture} from '../harness/fixtureJson';

type Span = {attributes: unknown[]; events: unknown[]; links: unknown[]};
const {spans} = decodeFixture(
  fs.readFileSync(path.join(import.meta.dirname, '..', 'fixtures', 'rich-span.handoff.json'), 'utf8'),
) as {spans: Span[]};
const sum = (f: (s: Span) => number) => spans.reduce((n, s) => n + f(s), 0);
const line =
  `RNOtel handOff spans=${spans.length} attrs=${sum(s => s.attributes.length)} ` +
  `events=${sum(s => s.events.length)} links=${sum(s => s.links.length)}`;

test('handOff crosses the Nitro seam', async ({app, screen, device, target}) => {
  const platform = platformOf(target);
  const {deviceId} = device.unstable_raw;
  await app.open();
  const since = await clearDeviceLog(platform, deviceId);
  await screen.getByTestId('tracer-bullet-handoff').tap();
  await expect(screen.getByTestId('tracer-bullet-done')).toBeVisible({timeout: 10_000});
  // the log line can land a moment after the tap returns
  let seen: string[] = [];
  for (let i = 0; i < 20 && !seen.length; i++) {
    seen = deviceLog(platform, deviceId, 'RNOtel handOff', since);
    if (!seen.length) await new Promise(r => setTimeout(r, 500));
  }
  expect(seen.at(-1) ?? '(no RNOtel handOff line in the device log)').toContain(line);
});

test('native test mode reaches initialize', async ({app, screen}) => {
  await app.open();
  await expect(screen.getByTestId('native-test-mode')).toHaveText('native testMode=true');
});
