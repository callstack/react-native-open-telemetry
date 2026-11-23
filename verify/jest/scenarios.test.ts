import {resourceFromAttributes} from '@opentelemetry/resources';
import {SimpleSpanProcessor, TracerProvider} from '@opentelemetry/sdk-trace';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-http';
import {startCollector, type Collector} from '../harness/collector';
import {compareToExpected, pendingScenarios} from '../harness/compare';
import {at} from '../harness/scenario';
import {sequentialIds} from '../../src/internal/testMode';
import {allScenarios} from '../scenarios';

let collector: Collector;
beforeAll(async () => {
  collector = await startCollector({port: 0});
});
afterAll(() => collector.close());

for (const s of allScenarios().filter(s => s.runners.includes('jest'))) {
  if (s.pending || pendingScenarios.has(s.name)) {
    test.todo(`${s.name} [js]`);
    continue;
  }
  test(`${s.name} [js]`, async () => {
    const provider = new TracerProvider({
      idGenerator: sequentialIds('0a'),
      resource: resourceFromAttributes({'service.name': 'verify'}),
      spanProcessors: [
        new SimpleSpanProcessor({exporter: new OTLPTraceExporter({url: collector.url + '/v1/traces'})}),
      ],
    });
    collector.begin(s.name, 'js');
    let actual;
    try {
      await s.run({tracer: provider.getTracer('verify'), getTracer: (n, v, o) => provider.getTracer(n, v, o), at});
      await provider.forceFlush();
    } finally {
      actual = await collector.end();
      await provider.shutdown();
    }
    const r = compareToExpected(s.name, 'js', actual);
    if (!r.ok) throw new Error('\n' + r.report);
  });
}
