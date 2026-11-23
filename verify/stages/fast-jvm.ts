import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import type {Stage} from '../run';
import {startCollector} from '../harness/collector';
import {compareToExpected} from '../harness/compare';

const root = path.join(import.meta.dirname, '..', '..');
const artifacts = path.join(root, 'verify', 'artifacts');

// The collector must keep serving while Gradle runs, so no spawnSync (ctx.sh) here.
const run = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) =>
  new Promise<void>((ok, fail) =>
    spawn(cmd, args, {cwd, env, stdio: 'inherit'}).on('error', fail)
      .on('exit', (c, sig) => (c === 0 ? ok() : fail(new Error(`${cmd} exited ${c ?? sig}`)))),
  );

const stage: Stage = {
  name: 'fast-jvm',
  order: 25,
  e2e: false,
  async run() {
    const names = fs.readdirSync(path.join(root, 'verify', 'fixtures'))
      .filter(f => f.endsWith('.handoff.json'))
      .map(f => f.slice(0, -'.handoff.json'.length))
      .sort();
    for (const n of names) fs.rmSync(path.join(artifacts, `${n}.android.otlp.json`), {force: true});
    const collector = await startCollector({port: 0});
    try {
      await run('./gradlew', ['test', '--console=plain', '-q'], path.join(root, 'android', 'core-jvm'), {
        ...process.env,
        VERIFY_COLLECTOR: collector.url,
      });
    } finally {
      await collector.close();
    }
    const failed: string[] = [];
    for (const n of names) {
      const f = path.join(artifacts, `${n}.android.otlp.json`);
      if (!fs.existsSync(f)) throw new Error(`${n}: the JVM test exported nothing (missing ${f})`);
      const {ok, report} = compareToExpected(n, 'android', JSON.parse(fs.readFileSync(f, 'utf8')));
      if (report) console.log(report);
      if (!ok) failed.push(n);
    }
    // R11: configured export headers reach the collector
    const raw = path.join(artifacts, 'raw', 'export-headers.android');
    const hdr = fs.readdirSync(raw).filter(f => f.endsWith('.headers.json'));
    if (!hdr.length || !hdr.every(f => JSON.parse(fs.readFileSync(path.join(raw, f), 'utf8'))['x-api-key'] === 'test'))
      failed.push('export-headers (x-api-key: test missing in headers.json)');
    if (failed.length) throw new Error(`android mismatch: ${failed.join(', ')}`);
    console.log(`fast-jvm: ${names.length} fixtures match their android files`);
  },
};

export default stage;
