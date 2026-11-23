import type {Stage} from '../run';
import {packContents, REQUIRED} from '../static/packContents';

// ponytail: nitrogen/ excluded until Task 2 commits nitrogen/generated; then drop this filter.
const required = REQUIRED.filter(r => r !== 'nitrogen/');

const stage: Stage = {
  name: 'static',
  order: 10,
  e2e: false,
  run({sh}) {
    sh(['bunx', 'tsc', '--noEmit']);
    sh(['bunx', 'oxlint']);
    const out = sh(['npm', 'pack', '--dry-run', '--json', '--ignore-scripts']);
    const list: string[] = JSON.parse(out)[0].files.map((f: {path: string}) => f.path);
    const missing = packContents(list, required);
    if (missing.length) throw new Error(`npm pack is missing: ${missing.join(', ')}`);
    sh(['bunx', 'jest', '--selectProjects', 'harness']);
  },
};

export default stage;
