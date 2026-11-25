import type {Tracer} from '@opentelemetry/api';
import {stampScope} from '../scope';

test('stampScope returns a tracer without instrumentationScope unchanged', () => {
  const tracer = {startSpan: () => undefined} as unknown as Tracer;
  expect(stampScope(tracer, {a: 1})).toBe(tracer);
  expect(tracer).not.toHaveProperty('instrumentationScope');
});
