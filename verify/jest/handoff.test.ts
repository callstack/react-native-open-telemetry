import {SamplingDecision} from '@opentelemetry/sdk-trace';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {TracerProvider} from '@opentelemetry/sdk-trace';
import {at} from '../harness/scenario';
import {sequentialIds} from '../../src/internal/testMode';
import {NativeHandOffProcessor} from '../../src/handoff/NativeHandOffProcessor';
import type {Otel, SeamSpan} from '../../src/native/Otel.nitro';

function setup() {
  const calls: SeamSpan[][] = [];
  const native = {
    handOff: (s: SeamSpan[]) => void calls.push(s),
    flush: async () => {},
  } as unknown as Otel;
  const provider = new TracerProvider({
    idGenerator: sequentialIds('0a'),
    resource: resourceFromAttributes({'service.name': 'verify'}),
    spanProcessors: [new NativeHandOffProcessor(native)],
  });
  return {calls, provider};
}

describe('NativeHandOffProcessor', () => {
  test('handOff receives a one-element array', () => {
    const {calls, provider} = setup();
    const t = provider.getTracer('t');
    t.startSpan('a', {startTime: at(0)}).end(at(1));
    t.startSpan('b', {startTime: at(2)}).end(at(3));
    expect(calls.map(c => c.length)).toEqual([1, 1]);
  });

  test('unsampled spans are never handed off', () => {
    const calls: SeamSpan[][] = [];
    const native = {handOff: (s: SeamSpan[]) => void calls.push(s)} as unknown as Otel;
    const provider = new TracerProvider({
      sampler: {shouldSample: () => ({decision: SamplingDecision.RECORD}), toString: () => 'record-only'},
      spanProcessors: [new NativeHandOffProcessor(native)],
    });
    const span = provider.getTracer('t').startSpan('a', {startTime: at(0)});
    expect(span.spanContext().traceFlags).toBe(0);
    expect(span.isRecording()).toBe(true);
    span.end(at(1));
    expect(calls).toEqual([]);
  });

  test('values outside AttrValue are dropped, never thrown', () => {
    const {calls, provider} = setup();
    const odd: any = {
      keep: 'x', n: null, obj: {id: 1}, bytes: new Uint8Array([1]), mixed: ['a', 1], withNull: ['a', null],
      ok: [1, 2], empty: [],
    };
    const span = provider.getTracer('t').startSpan('a', {startTime: at(0), attributes: odd});
    span.addEvent('e', odd, at(1));
    span.end(at(2));
    const keys = (a: {key: string}[]) => a.map(x => x.key);
    expect(keys(calls[0]![0]!.attributes)).toEqual(['keep', 'ok', 'empty']);
    expect(keys(calls[0]![0]!.events[0]!.attributes)).toEqual(['keep', 'ok', 'empty']);
  });

  test('a throwing handOff never escapes span.end()', () => {
    const native = {handOff: () => { throw new Error('nitro'); }} as unknown as Otel;
    const provider = new TracerProvider({spanProcessors: [new NativeHandOffProcessor(native)]});
    const t = provider.getTracer('t');
    expect(() => { t.startSpan('a').end(); t.startSpan('b').end(); }).not.toThrow();
  });
});
