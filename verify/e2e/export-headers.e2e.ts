import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {expectScenario, test} from './harness';

// R11: the app's init headers (x-api-key: test) reach the collector on every export request.
test('export-headers', async ({app, screen, collector, target}) => {
  await expectScenario('export-headers', target, {app, screen, collector});
  const raw = path.join(import.meta.dirname, '..', 'artifacts', 'raw', `export-headers.${target.split('-')[0]}`);
  const files = fs.readdirSync(raw).filter(f => f.endsWith('.headers.json'));
  expect(files.length).toBeGreaterThan(0);
  for (const f of files) expect(JSON.parse(fs.readFileSync(path.join(raw, f), 'utf8'))['x-api-key']).toBe('test');
});
