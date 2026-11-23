import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

export type Ctx = {e2e: boolean; update: boolean; sh: (cmd: string[]) => string};
export type Stage = {name: string; order: number; e2e?: boolean; run(ctx: Ctx): Promise<void> | void};

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const only = args.filter(a => !a.startsWith('--'));
const ctx: Ctx = {
  e2e: flags.includes('--e2e'),
  update: flags.includes('--update'),
  sh(cmd) {
    const [bin = '', ...rest] = cmd;
    const p = spawnSync(bin, rest, {encoding: 'utf8', stdio: ['inherit', 'pipe', 'inherit'], maxBuffer: 1 << 28});
    const out = p.stdout;
    if (p.status !== 0) {
      process.stdout.write(out);
      throw new Error(`${cmd.join(' ')} exited ${p.status}`);
    }
    if (cmd[0] !== 'npm') process.stdout.write(out);
    return out;
  },
};

const dir = join(import.meta.dirname, 'stages');
const stages: Stage[] = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.ts')).sort()) {
  stages.push((await import(join(dir, f))).default);
}
stages.sort((a, b) => a.order - b.order);

for (const s of stages) {
  if ((s.e2e && !ctx.e2e) || (only.length && !only.includes(s.name))) continue;
  console.log(`\n== ${s.name} ==`);
  try {
    await s.run(ctx);
  } catch (e) {
    console.error(`FAILED ${s.name}: ${(e as Error).message}`);
    process.exit(1);
  }
}
