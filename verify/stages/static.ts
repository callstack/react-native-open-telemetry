import type {Stage} from '../run';
import {packContents, REQUIRED} from '../static/packContents';

const stage: Stage = {
  name: 'static',
  order: 10,
  e2e: false,
  run({sh}) {
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
    sh(['bunx', 'jest', '--selectProjects', 'harness']);
  },
};

export default stage;
