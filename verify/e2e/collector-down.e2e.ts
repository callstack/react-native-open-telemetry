import {anyTarget, expectScenario, platformOf, tapFlush} from './harness';

// Collector down (§9.4): the app does not block, and the span arrives exactly once when the collector is back.
// Android: otel-java retries a 503 inside the export. iOS: opentelemetry-swift does not retry; it requeues the failed
// batch in memory and resends it on the next export or flush (X6), so the test flushes until the refusals are used up.
// Web: the OTel JS exporter retries a 503 inside the export (backoff 1 s x1.5, ±20 %): three refusals take up to 5.7 s.
anyTarget('collector-down', async ({app, screen, collector, target}) => {
  await expectScenario('collector-down', target, {app, screen, collector}, {
    afterBegin: () => collector.refuse(503, 3), // after begin, which clears refusals (F15)
    afterDone: async () => {
      // the app never waits on the collector: each forceFlush resolves within the native flush timeout (5 s),
      // on web once the exporter's own retries are done
      const timeout = platformOf(target) === 'web' ? 10_000 : 6_000;
      for (let n = 1; n <= 3; n++) await tapFlush(screen, n, timeout);
      await new Promise(r => setTimeout(r, 1_000)); // a late duplicate (iOS requeue) would now count against "once"
    },
  });
});
