import type {Stage} from '../run';
import {packContents, REQUIRED} from '../static/packContents';

const stage: Stage = {
  name: 'static',
  order: 10,
  e2e: false,
  run({sh}) {
    sh(['bunx', 'tsc', '--noEmit']);
    sh(['bun', 'run', 'codegen']);
    sh(['bun', 'run', '--cwd', 'example/modules/test-native', 'codegen']); // the example's TestNative module (Task 26)
    const generated = ['nitrogen/', 'example/modules/test-native/nitrogen/'];
    // git diff ignores untracked files, so list them too.
    sh(['git', 'diff', '--exit-code', ...generated]);
    if (sh(['git', 'ls-files', '--others', '--exclude-standard', ...generated]).trim()) {
      throw new Error('nitrogen/generated is out of date: run `bun run codegen` and commit');
    }
    sh(['bunx', 'oxlint']);
    const out = sh(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts']);
    const list: string[] = JSON.parse(out)[0].files.map((f: {path: string}) => f.path);
    const missing = packContents(list, REQUIRED);
    if (missing.length) throw new Error(`npm pack is missing: ${missing.join(', ')}`);
    sh(['bunx', 'jest', '--selectProjects', 'harness']);
  },
};

export default stage;
