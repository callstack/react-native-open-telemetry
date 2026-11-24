import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {MOBILE, test} from './harness';

const BUDGET = {handoffP50Us: 100, patchRatio: 3};
/** Report only: the gates use the unrounded values. */
const round = (x: number) => Math.round(x * 100) / 100;
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const OUT = path.join(import.meta.dirname, '..', 'artifacts', 'perf.json');

/** OTLP/JSON attribute value -> number or number[] (NaN when missing, which fails both budgets). */
const num = (v: any): number => Number(v?.doubleValue ?? v?.intValue ?? NaN);

// Performance guardrail (§9.2, R27): perf-budget sends its numbers as the attributes of one `perf-result` span;
// this test writes them to verify/artifacts/perf.json and fails only on the loose budgets. No shape file, no compare.
// android-bare only, by target name (android-expo runs the same JS through another init path, not another hand-off).
test('perf-budget', {platforms: MOBILE}, async ({app, screen, collector, device, target}) => {
  test.skip(target !== 'android-bare', 'perf-budget runs on android-bare only');
  await app.restart();
  collector.begin('perf-budget', 'android');
  let out;
  try {
    await screen.getByTestId('scenario-perf-budget').tap();
    await expect(screen.getByTestId('scenario-done')).toBeVisible({timeout: 120_000});
  } finally {
    out = await collector.end();
  }
  const span = (out.resourceSpans ?? [])
    .flatMap(r => r.scopeSpans.flatMap((s: any) => s.spans))
    .find(s => s.name === 'perf-result');
  if (!span) throw new Error('no perf-result span arrived');
  const attrs = new Map<string, any>(span.attributes.map((a: any) => [a.key.replace(/^com\.callstack\.perf\./, ''), a.value]));
  const n = (k: string) => num(attrs.get(k));
  const ns = (k: string): number[] => (attrs.get(k)?.arrayValue?.values ?? []).map(num);
  const prop = (p: string) =>
    execFileSync('adb', ['-s', device.unstable_raw.deviceId, 'shell', 'getprop', p], {encoding: 'utf8'}).trim();

  const p50Us = n('handoff.p50_us');
  const onMs = ns('await.on_ms');
  const offMs = ns('await.off_ms');
  const ratio = onMs.length && offMs.length ? median(onMs) / median(offMs) : NaN;
  const report = {
    scenario: 'perf-budget',
    target,
    build: 'release, test mode on (test-mode ids and resource; the same JS -> Nitro hand-off seam as production)',
    measuredAt: new Date().toISOString(),
    device: {
      model: prop('ro.product.model'),
      emulator: prop('ro.kernel.qemu') === '1' || prop('ro.boot.qemu') === '1',
      abi: prop('ro.product.cpu.abi'),
      androidRelease: prop('ro.build.version.release'),
      apiLevel: Number(prop('ro.build.version.sdk')),
    },
    handoff: {
      what: 'per span, in the test-mode build: tracer.startSpan -> setAttribute x10 -> end(), through NativeHandOffProcessor.onEnd -> Nitro handOff (synchronous on the JS thread, the production seam); performance.now() around each span',
      spans: n('handoff.spans'),
      warmupSpans: n('handoff.warmup'),
      p50Us: round(p50Us),
      p95Us: round(n('handoff.p95_us')),
      endOnlyP50Us: round(n('handoff.end_p50_us')), // end() alone: onEnd, isSampled, toSeamSpan, handOff
      budgetP50Us: BUDGET.handoffP50Us,
    },
    patch: {
      what: 'in the test-mode build: alternating rounds (on, off, on, off, …) of N sequential `await null` inside an active span (the wrapped path); off = Promise.prototype.then restored from the patch marker for the leg (R27); ratio = median(on) / median(off)',
      awaitsPerLeg: n('await.count'),
      rounds: n('await.rounds'),
      onMs: onMs.map(round),
      offMs: offMs.map(round),
      medianOnMs: round(median(onMs)),
      medianOffMs: round(median(offMs)),
      ratio: round(ratio),
      budgetRatio: BUDGET.patchRatio,
    },
  };
  fs.mkdirSync(path.dirname(OUT), {recursive: true});
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  console.log(`perf.json: ${JSON.stringify(report)}`);
  expect(p50Us).toBeLessThan(BUDGET.handoffP50Us);
  expect(ratio).toBeLessThan(BUDGET.patchRatio);
});
