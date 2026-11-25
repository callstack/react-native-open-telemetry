import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type Section = {offset: {line: number; column: number}; map: {sources: string[]}};

/** Bytes of each module in a Metro bundle, from its sectioned source map (one section per module). */
export function bytesPerSource(map: {sections: Section[]}, code: string): Map<string, number> {
  const lineStart = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') lineStart.push(i + 1);
  const at = ({line, column}: Section['offset']) => lineStart[line]! + column;
  const out = new Map<string, number>();
  map.sections.forEach((s, i) => {
    const next = map.sections[i + 1];
    const name = s.map.sources[0] ?? '(none)';
    out.set(name, (out.get(name) ?? 0) + (next ? at(next.offset) : code.length) - at(s.offset));
  });
  return out;
}

/** The SDK's share: the package's own src/ and @opentelemetry/*. */
export const isSdk = (repoRoot: string) => (source: string) => {
  const rel = path.relative(repoRoot, path.resolve(repoRoot, source));
  return rel.startsWith('src' + path.sep) || rel.startsWith('lib' + path.sep) || /(^|[/\\])node_modules[/\\]@opentelemetry[/\\]/.test(rel);
};

/** Release-bundles the example app and returns the SDK's bytes in it. */
export function measureSdkBytes(repoRoot: string, platform = 'android'): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'otel-bundle-'));
  const bundle = path.join(dir, 'index.bundle');
  const map = bundle + '.map';
  const p = spawnSync(
    'npx',
    ['react-native', 'bundle', '--platform', platform, '--dev', 'false', '--minify', 'true', '--entry-file', 'index.js',
      '--bundle-output', bundle, '--sourcemap-output', map],
    {cwd: path.join(repoRoot, 'example'), encoding: 'utf8'},
  );
  if (p.status !== 0) throw new Error(`react-native bundle failed:\n${p.stdout}${p.stderr}`);
  const sizes = bytesPerSource(JSON.parse(fs.readFileSync(map, 'utf8')), fs.readFileSync(bundle, 'utf8'));
  fs.rmSync(dir, {recursive: true, force: true});
  const sdk = isSdk(repoRoot);
  let total = 0;
  for (const [s, n] of sizes) if (sdk(s)) total += n;
  return total;
}

/** Fails above +10% of the baseline. */
export function checkBundleSize(actual: number, baseline: number): string | undefined {
  const limit = Math.floor(baseline * 1.1);
  return actual > limit ? `SDK bundle share ${actual} B is over ${limit} B (baseline ${baseline} B + 10%)` : undefined;
}
