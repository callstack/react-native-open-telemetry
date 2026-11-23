import {shapeOf} from '../shape';

const span = (o: any) => ({
  traceId: '0a01',
  spanId: '0a02',
  name: 'x',
  kind: 1,
  startTimeUnixNano: '1',
  endTimeUnixNano: '2',
  ...o,
});
const mk = (spans: any[]) => ({
  resourceSpans: [
    {
      resource: {attributes: [{key: 'service.name', value: {stringValue: 's'}}]},
      scopeSpans: [
        {scope: {name: 'sc', attributes: [{key: 'z', value: {boolValue: true}}]}, spans},
      ],
    },
  ],
});

test('shapeOf ignores ids and timestamps', () => {
  const a = mk([
    span({spanId: '0a01', name: 'root', startTimeUnixNano: '5', attributes: [{key: 'k', value: {intValue: '1'}}]}),
    span({spanId: '0a02', parentSpanId: '0a01', name: 'child', startTimeUnixNano: '6', attributes: [{key: 'arr', value: {arrayValue: {values: [{stringValue: 'a'}]}}}]}),
  ]);
  const b = mk([
    span({traceId: 'ff', spanId: 'bb02', parentSpanId: 'bb01', name: 'child', startTimeUnixNano: '99', attributes: [{key: 'arr', value: {arrayValue: {values: [{stringValue: 'q'}]}}}]}),
    span({traceId: 'ff', spanId: 'bb01', name: 'root', startTimeUnixNano: '90', attributes: [{key: 'k', value: {intValue: '7'}}]}),
  ]);
  expect(shapeOf(a)).toEqual(shapeOf(b));
  expect(shapeOf(a)).toEqual({
    resource: ['service.name'],
    scope: ['z'],
    traces: [
      [
        {name: 'child', kind: 1, parent: 'root', status: 0, links: [], attributes: {arr: 'array<string>'}},
        {name: 'root', kind: 1, parent: null, status: 0, links: [], attributes: {k: 'int'}},
      ],
    ],
  });
});
