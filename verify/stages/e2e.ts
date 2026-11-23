import type {Stage} from '../run';

const stage: Stage = {
  name: 'e2e',
  order: 90,
  e2e: true,
  run({sh}) {
    // E2E_TARGET=android-bare|ios-bare runs one target (CI runs one per job)
    const target = process.env.E2E_TARGET ? ['--target', process.env.E2E_TARGET] : [];
    // Device runs compare to the reviewed .js files until Tasks 24/25: never --update them from a device.
    const update = process.env.VERIFY_UPDATE;
    delete process.env.VERIFY_UPDATE;
    try {
      sh(['bunx', 'e2e', 'run', '--config', 'verify/e2e/e2e.config.ts', ...target]);
    } finally {
      if (update !== undefined) process.env.VERIFY_UPDATE = update;
    }
  },
};

export default stage;
