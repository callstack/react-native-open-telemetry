import path from 'node:path';
import type {Stage} from '../run';
import {replayFixtures} from '../harness/nativeReplay';

const stage: Stage = {
  name: 'fast-jvm',
  order: 25,
  e2e: false,
  async run() {
    const cwd = path.join(import.meta.dirname, '..', '..', 'android', 'core-jvm');
    const n = await replayFixtures('android', './gradlew', ['test', '--console=plain', '-q'], cwd);
    console.log(`fast-jvm: ${n} fixtures match their android files`);
  },
};

export default stage;
