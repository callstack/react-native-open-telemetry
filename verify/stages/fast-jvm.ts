import path from 'node:path';
import type {Stage} from '../run';
import {replayFixtures} from '../harness/nativeReplay';

// the example app's wrapper (same Gradle version); core-jvm has none of its own
const GRADLEW = path.join(import.meta.dirname, '..', '..', 'example', 'android', 'gradlew');

const stage: Stage = {
  name: 'fast-jvm',
  order: 25,
  e2e: false,
  async run() {
    const cwd = path.join(import.meta.dirname, '..', '..', 'android', 'core-jvm');
    const n = await replayFixtures('android', GRADLEW, ['test', '--console=plain', '-q'], cwd);
    console.log(`fast-jvm: ${n} fixtures match their android files`);
  },
};

export default stage;
