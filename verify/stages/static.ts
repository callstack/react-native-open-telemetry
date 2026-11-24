import type {Stage} from '../run';
import fs from 'node:fs';
import path from 'node:path';
import {checkBundleSize, measureSdkBytes} from '../static/bundleSize';
import {packContents, REQUIRED} from '../static/packContents';

const stage: Stage = {
  name: 'static',
  order: 10,
  e2e: false,
  run({sh, update}) {
    sh(['bunx', 'tsc', '--noEmit']);
    sh(['bun', 'run', 'codegen']);
    // git diff ignores untracked files, so list them too.
    sh(['git', 'diff', '--exit-code', 'nitrogen/']);
    if (sh(['git', 'ls-files', '--others', '--exclude-standard', 'nitrogen/']).trim()) {
      throw new Error('nitrogen/generated is out of date: run `bun run codegen` and commit');
    }
    sh(['bunx', 'oxlint']);
    const out = sh(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts']);
    const list: string[] = JSON.parse(out)[0].files.map((f: {path: string}) => f.path);
    const missing = packContents(list, REQUIRED);
    if (missing.length) throw new Error(`npm pack is missing: ${missing.join(', ')}`);
    // iOS has no build-time access to package.json (Android reads it in Gradle): the Swift constant must match.
    const root = path.join(import.meta.dirname, '..', '..');
    const {version} = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (!fs.readFileSync(path.join(root, 'ios', 'RNOtel', 'RNOtel.swift'), 'utf8').includes(`let packageVersion = "${version}"`))
      throw new Error(`ios/RNOtel/RNOtel.swift: set packageVersion to "${version}" (package.json)`);
    sh(['bunx', 'jest', '--selectProjects', 'harness']);
    // SDK share of the example's release bundle (src/ + @opentelemetry/*), +10% budget; ~2-10s
    const baselineFile = path.join(root, 'verify', 'static', 'bundle-baseline.json');
    const sdkBytes = measureSdkBytes(root);
    if (update) fs.writeFileSync(baselineFile, JSON.stringify({sdkBytes}, null, 2) + '\n');
    const {sdkBytes: baseline} = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    console.log(`bundle-size: SDK share ${sdkBytes} B (baseline ${baseline} B)`);
    const err = checkBundleSize(sdkBytes, baseline);
    if (err) throw new Error(err);
  },
};

export default stage;
