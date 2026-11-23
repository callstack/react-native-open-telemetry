import {at} from '../scenario';
import {sequentialIds} from '../../../src/internal/testMode';

test('sequentialIds', () => {
  const g = sequentialIds('0a');
  expect(g.generateTraceId()).toBe('0a000000000000000000000000000001');
  expect(g.generateTraceId()).toBe('0a000000000000000000000000000002');
  expect(g.generateSpanId()).toBe('0a00000000000001');
  g.reset();
  expect(g.generateSpanId()).toBe('0a00000000000001');
});

test('at', () => {
  expect(at(3)).toEqual([1767225600, 3000]);
  expect(at(1_500_000)).toEqual([1767225601, 500_000_000]);
});
