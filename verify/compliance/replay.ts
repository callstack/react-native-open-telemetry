// Replays captured raw requests (protobuf as application/x-protobuf, JSON as application/json) and the expected
// *.otlp.json files into a real OpenTelemetry Collector. Fails on any non-2xx (the collector log is checked in CI).
// Usage: bun verify/compliance/replay.ts --url http://localhost:4318 --dirs <artifact dir>... [--expected verify/expected]
import fs from 'node:fs';
import path from 'node:path';

// X9: the Collector's OTLP/JSON parser may reject `"doubleValue": "NaN"` / "Infinity" strings (protojson allows
// them, pdata's reader is unverified). A rejection of these files is reported loudly, not failed: the protobuf raw
// requests of the same scenarios still prove the value reaches a real Collector. Anything else must be 2xx.
export const JSON_EXCEPTIONS: Record<string, string> = {
  'odd-attributes.js.otlp.json': 'X9: NaN/Infinity doubleValue strings; protobuf raw requests cover it',
  'odd-attributes.android.otlp.json': 'X9: NaN/Infinity doubleValue strings; protobuf raw requests cover it',
  'odd-attributes.ios.otlp.json': 'X9: NaN/Infinity doubleValue strings; protobuf raw requests cover it',
  'odd-attributes.web.otlp.json': 'X9: NaN/Infinity doubleValue strings; protobuf raw requests cover it',
};

const walk = (d: string): string[] =>
  fs.readdirSync(d, {withFileTypes: true}).flatMap(e => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });

/** `raw/<scenario>.<platform>/<n>.pb|json`, wherever the artifact download put `raw`. */
const isRaw = (f: string) =>
  /\.(pb|json)$/.test(f) && !f.endsWith('.headers.json') && path.basename(path.dirname(path.dirname(f))) === 'raw';

export async function replay(opts: {url: string; dirs: string[]; expected?: string}) {
  const jobs: {file: string; type: string; exception?: string}[] = [];
  for (const d of opts.dirs)
    for (const f of walk(d).filter(isRaw).sort())
      jobs.push({file: f, type: f.endsWith('.pb') ? 'application/x-protobuf' : 'application/json'});
  const raw = jobs.length;
  if (opts.expected)
    for (const f of fs.readdirSync(opts.expected).filter(f => f.endsWith('.otlp.json')).sort())
      jobs.push({file: path.join(opts.expected, f), type: 'application/json', exception: JSON_EXCEPTIONS[f]});
  const failures: string[] = [];
  const tolerated: string[] = [];
  for (const j of jobs) {
    const res = await fetch(`${opts.url}/v1/traces`, {
      method: 'POST',
      headers: {'content-type': j.type},
      body: fs.readFileSync(j.file),
    });
    const text = await res.text();
    if (res.ok) continue;
    const msg = `${j.file}: HTTP ${res.status} ${text.slice(0, 200)}`;
    (j.exception ? tolerated : failures).push(j.exception ? `${msg} [tolerated: ${j.exception}]` : msg);
  }
  return {raw, expected: jobs.length - raw, failures, tolerated};
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
  for (const t of r.tolerated) console.warn(`WARNING ${t}`);
  for (const f of r.failures) console.error(`FAIL ${f}`);
  if (r.failures.length) process.exit(1);
  if (r.raw === 0) {
    console.error('FAIL no raw requests found under --dirs');
    process.exit(1);
  }
}

if (require.main === module) void main();
