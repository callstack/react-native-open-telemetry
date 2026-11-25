import {spawnSync} from 'node:child_process';
import type {Stage} from '../run';

const stage: Stage = {
  name: 'e2e',
  order: 90,
  e2e: true,
  run() {
    const target = process.env.E2E_TARGET ? ['--target', process.env.E2E_TARGET] : [];
    const update = process.env.VERIFY_UPDATE;
    delete process.env.VERIFY_UPDATE;
    try {
      const cmd = ['bunx', 'e2e', 'run', '--config', 'verify/e2e/e2e.config.ts', ...target];
      const p = spawnSync(cmd[0]!, cmd.slice(1), {stdio: 'inherit'});
      if (p.status !== 0) throw new Error(`${cmd.join(' ')} exited ${p.status ?? p.signal}`);
    } finally {
      if (update !== undefined) process.env.VERIFY_UPDATE = update;
    }
  },
};

export default stage;
