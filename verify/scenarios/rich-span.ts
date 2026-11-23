import {SpanStatusCode, TraceFlags} from '@opentelemetry/api';
import {scenario} from '../harness/scenario';

export default scenario('rich-span', async ({getTracer, at}) => {
  const tracer = getTracer('verify.rich', '1.2.3', {schemaUrl: 'https://opentelemetry.io/schemas/1.40.0'});
  // sdk-trace 3.1 has no API for scope attributes; its OTLP exporter reads them off the scope at runtime.
  Object.assign((tracer as any).instrumentationScope, {attributes: {'scope.key': 'scope-value'}});
  const span = tracer.startSpan('rich', {
    startTime: at(0),
    attributes: {
      str: 'zażółć 🚀',
      int: 42,
      double: 1.5,
      bool: true,
      strs: ['a', 'b'],
      ints: [1, 2, 3],
      doubles: [1.5, 2.5],
      bools: [true, false],
    },
    links: [
      {
        context: {traceId: '0f'.padEnd(32, '1'), spanId: '0f'.padEnd(16, '2'), traceFlags: TraceFlags.SAMPLED},
        attributes: {'link.key': 'link-value', 'link.n': 7},
      },
    ],
  });
  span.addEvent('first', {'event.key': 'e1', 'event.n': 1}, at(10));
  span.addEvent('second', {'event.ok': true}, at(20));
  span.setStatus({code: SpanStatusCode.ERROR, message: 'boom'});
  span.end(at(100));
});
