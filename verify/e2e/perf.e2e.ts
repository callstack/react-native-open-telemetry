import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {expect} from 'e2e';
import {MOBILE, test} from './harness';

const BUDGET = {handoffP50Us: 100, patchRatio: 3};
const round = (x: number) => Math.round(x * 100) / 100;
const OUT = path.join(import.meta.dirname, '..', 'artifacts', 'perf.json');

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
  const m: Record<string, number> = Object.fromEntries(
    span.attributes.map((a: any) => [a.key.replace(/^com\.callstack\.perf\./, ''), Number(a.value.doubleValue ?? a.value.intValue)]),
  );
  const n = (k: string) => m[k] ?? NaN; // NaN fails both budgets
  const prop = (p: string) =>
    execFileSync('adb', ['-s', device.unstable_raw.deviceId, 'shell', 'getprop', p], {encoding: 'utf8'}).trim();
  const ratio = n('await.on_ms') / n('await.off_ms');
  const report = {
    scenario: 'perf-budget',
    target,
    measuredAt: new Date().toISOString(),
    device: {
      model: prop('ro.product.model'),
      emulator: prop('ro.kernel.qemu') === '1' || prop('ro.boot.qemu') === '1',
      abi: prop('ro.product.cpu.abi'),
      androidRelease: prop('ro.build.version.release'),
      apiLevel: Number(prop('ro.build.version.sdk')),
    },
    handoff: {
      what: 'per span: tracer.startSpan -> setAttribute x10 -> end(), through NativeHandOffProcessor.onEnd -> Nitro handOff (synchronous on the JS thread); performance.now() around each span',
      spans: n('handoff.spans'),
      warmupSpans: n('handoff.warmup'),
      p50Us: n('handoff.p50_us'),
      p95Us: n('handoff.p95_us'),
      endOnlyP50Us: n('handoff.end_p50_us'), // end() alone: onEnd, isSampled, toSeamSpan, handOff
      budgetP50Us: BUDGET.handoffP50Us,
    },
    patch: {
      what: 'N sequential `await null` inside an active span (the wrapped path); off = Promise.prototype.then restored from the patch marker for the leg (R27)',
      awaits: n('await.count'),
      onMs: round(n('await.on_ms')),
      offMs: round(n('await.off_ms')),
      ratio: round(ratio),
      budgetRatio: BUDGET.patchRatio,
    },
  };
  fs.mkdirSync(path.dirname(OUT), {recursive: true});
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  console.log(`perf.json: ${JSON.stringify(report)}`);
  expect(report.handoff.p50Us).toBeLessThan(BUDGET.handoffP50Us);
  expect(report.patch.ratio).toBeLessThan(BUDGET.patchRatio);
});
