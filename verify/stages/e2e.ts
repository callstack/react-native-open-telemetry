import type {Stage} from '../run';

const stage: Stage = {
  name: 'e2e',
  order: 90,
  e2e: true,
  run({sh}) {
    // E2E_TARGET=android-bare|ios-bare runs one target (CI runs one per job)
    const target = process.env.E2E_TARGET ? ['--target', process.env.E2E_TARGET] : [];
    sh(['bunx', 'e2e', 'run', '--config', 'verify/e2e/e2e.config.ts', ...target]);
  },
};

export default stage;
