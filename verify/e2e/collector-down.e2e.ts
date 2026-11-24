import {expectScenario, tapFlush, test} from './harness';

// Collector down (§9.4): the app does not block, and the span arrives exactly once when the collector is back.
// Android: otel-java retries a 503 inside the export. iOS: opentelemetry-swift does not retry; it requeues the failed
// batch in memory and resends it on the next export or flush (X6), so the test flushes until the refusals are used up.
test('collector-down', async ({app, screen, collector, target}) => {
  await expectScenario('collector-down', target, {app, screen, collector}, {
    afterBegin: () => collector.refuse(503, 3), // after begin, which clears refusals (F15)
    doneTimeout: 2_000,
    afterDone: async () => {
      // each forceFlush resolves while the collector refuses (native flush timeout 5 s)
      for (let n = 1; n <= 3; n++) await tapFlush(screen, n);
    },
  });
});
