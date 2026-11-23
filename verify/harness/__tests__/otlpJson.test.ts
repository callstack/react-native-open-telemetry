import {toOtlpJson} from '../otlpJson';

test('toOtlpJson converts ids to hex', () => {
  const traceId = Buffer.alloc(16);
  traceId[0] = 0x0a;
  traceId[15] = 1;
  const out = toOtlpJson({
    resourceSpans: [
      {
        scopeSpans: [
          {
            spans: [
              {
                traceId,
                spanId: Buffer.from('0a00000000000002', 'hex'),
                name: 's',
                startTimeUnixNano: '1767225600000000000',
                kind: 1,
                attributes: [{key: 'n', value: {intValue: '7'}}],
              },
            ],
          },
        ],
      },
    ],
  });
  const s = out.resourceSpans![0].scopeSpans[0].spans[0];
  expect(s.traceId).toBe('0a000000000000000000000000000001');
  expect(s.spanId).toBe('0a00000000000002');
  expect(s.parentSpanId).toBeUndefined();
  expect(s.startTimeUnixNano).toBe('1767225600000000000');
  expect(s.kind).toBe(1);
  expect(s.attributes[0].value.intValue).toBe('7');
});
