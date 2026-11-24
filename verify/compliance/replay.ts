// Replays captured raw requests (protobuf as application/x-protobuf, JSON as application/json) and the expected
// *.otlp.json files into a real OpenTelemetry Collector. Fails on any non-2xx (the collector log is checked in CI).
// Usage: bun verify/compliance/replay.ts --url http://localhost:4318 --dirs <artifact dir>... [--expected verify/expected]
import fs from 'node:fs';
import path from 'node:path';

const walk = (d: string): string[] =>
  fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

/** `raw/<scenario>.<platform>/<n>.pb|json`, wherever the artifact download put `raw`. */
const isRaw = (f: string) =>
  /\.(pb|json)$/.test(f) && !f.endsWith('.headers.json') && path.basename(path.dirname(path.dirname(f))) === 'raw';

export async function replay(opts: {url: string; dirs: string[]; expected?: string}) {
  const jobs: {file: string; type: string}[] = [];
  for (const d of opts.dirs)
    for (const f of walk(d).filter(isRaw).sort())
      jobs.push({file: f, type: f.endsWith('.pb') ? 'application/x-protobuf' : 'application/json'});
  const raw = jobs.length;
  if (opts.expected)
    for (const f of fs.readdirSync(opts.expected).filter(f => f.endsWith('.otlp.json')).sort())
      jobs.push({file: path.join(opts.expected, f), type: 'application/json'});
  const failures: string[] = [];
  for (const j of jobs) {
    const res = await fetch(`${opts.url}/v1/traces`, {
      method: 'POST',
      headers: {'content-type': j.type},
      body: fs.readFileSync(j.file),
    });
    const text = await res.text();
    if (!res.ok) failures.push(`${j.file}: HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  return {raw, expected: jobs.length - raw, failures};
}

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n: string) => {
    const i = argv.indexOf(n);
    if (i < 0) return undefined;
    const rest = argv.slice(i + 1);
    const end = rest.findIndex(x => x.startsWith('--'));
    return end < 0 ? rest : rest.slice(0, end);
  };
  const url = arg('--url')?.[0];
  if (!url) throw new Error('--url required');
  const r = await replay({
    url,
    dirs: arg('--dirs') ?? [],
    expected: arg('--expected')?.[0] ?? path.join(__dirname, '..', 'expected'),
  });
  console.log(`replayed ${r.raw} raw requests and ${r.expected} expected files`);
  for (const f of r.failures) console.error(`FAIL ${f}`);
  if (r.failures.length) process.exit(1);
  if (r.raw === 0) {
    console.error('FAIL no raw requests found under --dirs');
    process.exit(1);
  }
}

if (require.main === module) void main();
