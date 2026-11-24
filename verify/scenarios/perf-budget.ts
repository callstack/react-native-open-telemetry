import {context, trace} from '@opentelemetry/api';
import {scenario} from '../harness/scenario';

const SPANS = 1_000;
const WARMUP = 100;
const AWAITS = 10_000;
const P = 'com.callstack.perf.';

const pct = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))]!;
const us = (ms: number) => Math.round(ms * 10_000) / 10; // 0.1 µs

async function awaits(n: number) {
  const t0 = performance.now();
  for (let i = 0; i < n; i++) await null;
  return performance.now() - t0;
}

/**
 * Performance guardrail (§9.2, Task 29), `android-bare` only: (a) 1,000 spans × 10 attributes through the real
 * hand-off, p50/p95 µs per span; (b) 10,000 awaits inside an active span with the patch on vs off (R27: `then`
 * restored from the patch marker for the off leg). The numbers leave as the attributes of one `perf-result` span;
 * verify/e2e/perf.e2e.ts writes `verify/artifacts/perf.json` and applies the budgets. No shape file.
 */
export default scenario(
  'perf-budget',
  async ({tracer}) => {
    const total: number[] = [];
    const end: number[] = [];
    for (let i = 0; i < WARMUP + SPANS; i++) {
      const t0 = performance.now();
      const span = tracer.startSpan('perf');
      for (let a = 0; a < 10; a++) span.setAttribute(`a${a}`, i);
      const t1 = performance.now();
      span.end();
      const t2 = performance.now();
      if (i < WARMUP) continue;
      total.push(t2 - t0);
      end.push(t2 - t1);
    }

    const marker = (globalThis as any)[Symbol.for('com.callstack.otel.patched')];
    if (!marker) throw new Error('perf-budget: the context patch is not installed');
    const patched = Promise.prototype.then;
    // inside an active span: the wrapped path (at ROOT the patch calls the original `then` directly). Each leg
    // enters the span's context itself, since the off leg loses it after its first await.
    const span = tracer.startSpan('perf.awaits');
    const inSpan = (n: number) => context.with(trace.setSpan(context.active(), span), () => awaits(n));
    await inSpan(1_000); // warm-up
    const onMs = await inSpan(AWAITS);
    let offMs = 0;
    Promise.prototype.then = marker.then;
    try {
      offMs = await inSpan(AWAITS);
    } finally {
      Promise.prototype.then = patched;
    }
    span.end();

    tracer
      .startSpan('perf-result', {
        attributes: {
          [`${P}handoff.spans`]: SPANS,
          [`${P}handoff.warmup`]: WARMUP,
          [`${P}handoff.p50_us`]: us(pct(total, 0.5)),
          [`${P}handoff.p95_us`]: us(pct(total, 0.95)),
          [`${P}handoff.end_p50_us`]: us(pct(end, 0.5)),
          [`${P}await.count`]: AWAITS,
          [`${P}await.on_ms`]: onMs,
          [`${P}await.off_ms`]: offMs,
        },
      })
      .end();
  },
  {runners: ['e2e'], targets: ['android-bare']},
);
