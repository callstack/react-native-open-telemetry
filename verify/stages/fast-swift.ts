import path from 'node:path';
import type {Stage} from '../run';
import {replayFixtures} from '../harness/nativeReplay';

const stage: Stage = {
  name: 'fast-swift',
  order: 30,
  e2e: false,
  async run() {
    if (process.platform !== 'darwin') return void console.log('skipped: not macOS');
    const n = await replayFixtures('ios', 'swift', ['test'], path.join(import.meta.dirname, '..', '..'));
    console.log(`fast-swift: ${n} fixtures match their ios files`);
  },
};

export default stage;
