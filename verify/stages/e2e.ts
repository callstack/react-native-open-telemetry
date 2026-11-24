import type {Stage} from '../run';

const stage: Stage = {
  name: 'e2e',
  order: 90,
  e2e: true,
  run({sh}) {
    // E2E_TARGET=android-bare|ios-bare|android-expo|ios-expo runs one target (CI runs one per job)
    const target = process.env.E2E_TARGET ? ['--target', process.env.E2E_TARGET] : [];
    // E2E_SMOKE=1: a test-mode-off build is installed, so only smoke.e2e.ts can pass (VERIFY.md)
    const files = process.env.E2E_SMOKE === '1' ? ['smoke'] : [];
    // Device runs compare to the reviewed expected files: never --update them from a device.
    const update = process.env.VERIFY_UPDATE;
    delete process.env.VERIFY_UPDATE;
    try {
      sh(['bunx', 'e2e', 'run', '--config', 'verify/e2e/e2e.config.ts', ...target, ...files]);
    } finally {
      if (update !== undefined) process.env.VERIFY_UPDATE = update;
    }
  },
};

export default stage;
