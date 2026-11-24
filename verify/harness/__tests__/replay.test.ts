import fs from 'fs';
import os from 'os';
import path from 'path';
import {startCollector} from '../collector';
import {replay} from '../../compliance/replay';

test('replay posts raw + expected files, fails on a non-2xx', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'replay-'));
  const c = await startCollector({port: 0, artifactsDir: path.join(dir, 'sink')});
  try {
    const good = JSON.stringify({resourceSpans: [{scopeSpans: [{spans: [{traceId: '0a'.padEnd(32, '0'), spanId: '0a00000000000001', name: 'x'}]}]}]});
    const raw = path.join(dir, 'dl', 'artifacts', 'raw', 's.web');
    fs.mkdirSync(raw, {recursive: true});
    fs.writeFileSync(path.join(raw, '0.json'), good);
    fs.writeFileSync(path.join(raw, '0.headers.json'), '{}'); // not a request
    const exp = path.join(dir, 'expected');
    fs.mkdirSync(exp);
    fs.writeFileSync(path.join(exp, 'a.js.otlp.json'), good);
    const ok = await replay({url: c.url, dirs: [path.join(dir, 'dl')], expected: exp});
    expect(ok).toEqual({raw: 1, expected: 1, failures: []});

    fs.writeFileSync(path.join(exp, 'b.js.otlp.json'), '{not json');
    const bad = await replay({url: c.url, dirs: [path.join(dir, 'dl')], expected: exp});
    expect(bad.failures).toHaveLength(1);
  } finally {
    await c.close();
  }
});
