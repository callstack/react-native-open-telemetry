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

const wrap = (span: any) => ({
  resourceSpans: [{scopeSpans: [{spans: [span]}]}],
});
const hexSpan = {
  traceId: '0a000000000000000000000000000001',
  spanId: '0a00000000000002',
  parentSpanId: '0a00000000000001',
  name: 's',
  links: [{traceId: '0b000000000000000000000000000001', spanId: '0b00000000000002'}],
};
const spanOf = (o: any) => o.resourceSpans[0].scopeSpans[0].spans[0];

test('JSON-in with hex ids yields the same ids out, and equals protobuf-in', () => {
  const fromJson = toOtlpJson(wrap(hexSpan));
  expect(spanOf(fromJson).traceId).toBe(hexSpan.traceId);
  expect(spanOf(fromJson).links[0].spanId).toBe('0b00000000000002');
  const asBuffers = {
    ...hexSpan,
    traceId: Buffer.from(hexSpan.traceId, 'hex'),
    spanId: Buffer.from(hexSpan.spanId, 'hex'),
    parentSpanId: Buffer.from(hexSpan.parentSpanId, 'hex'),
    links: [{traceId: Buffer.from('0b000000000000000000000000000001', 'hex'), spanId: Buffer.from('0b00000000000002', 'hex')}],
  };
  expect(toOtlpJson(wrap(asBuffers))).toEqual(fromJson);
});

test('bytesValue becomes base64, not hex or an index map', () => {
  const out = toOtlpJson(
    wrap({name: 's', attributes: [{key: 'b', value: {bytesValue: Buffer.from([1, 2, 3])}}]}),
  );
  expect(spanOf(out).attributes[0].value.bytesValue).toBe('AQID');
});

test('non-finite doubles use proto3 JSON strings; -0 stays -0 in memory', () => {
  const d = (key: string, v: number) => ({key, value: {doubleValue: v}});
  const out = toOtlpJson(
    wrap({name: 's', attributes: [d('n', NaN), d('i', Infinity), d('m', -Infinity), d('z', -0), d('o', 1.5)]}),
  );
  const v = (k: string) => spanOf(out).attributes.find((a: any) => a.key === k).value.doubleValue;
  expect(v('n')).toBe('NaN');
  expect(v('i')).toBe('Infinity');
  expect(v('m')).toBe('-Infinity');
  expect(Object.is(v('z'), -0)).toBe(true);
  expect(v('o')).toBe(1.5);
});
