import fs from 'fs';
import path from 'path';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {TracerProvider} from '@opentelemetry/sdk-trace';
import {decodeFixture, encodeFixture} from '../harness/fixtureJson';
import {at} from '../harness/scenario';
import {sequentialIds} from '../../src/internal/testMode';
import {NativeHandOffProcessor} from '../../src/handoff/NativeHandOffProcessor';
import type {Otel, SeamSpan} from '../../src/native/Otel.nitro';
import {allScenarios} from '../scenarios';

const NAMES = ['handoff-basic', 'rich-span', 'odd-attributes', 'nest-after-await'];
const CONFIG = {
  serviceName: 'verify',
  serviceVersion: '0.0.0',
  resourceAttributes: [],
  exportUrl: '<collector>',
  exportHeaders: [],
};
const dir = path.join(process.env.VERIFY_DIR ?? path.join(__dirname, '..'), 'fixtures');

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
    const {calls, provider} = setup();
    const span = provider.getTracer('t').startSpan('a', {startTime: at(0)});
    span.end(at(1));
    calls.length = 0;
    const native = {handOff: (s: SeamSpan[]) => void calls.push(s)} as unknown as Otel;
    const unsampled = {...span, spanContext: () => ({...span.spanContext(), traceFlags: 0})};
    new NativeHandOffProcessor(native).onEnd(unsampled as any);
    expect(calls).toEqual([]);
  });
});

for (const name of NAMES) {
  test(`${name} fixture matches hand-off payloads`, async () => {
    const s = allScenarios().find(x => x.name === name)!;
    const {calls, provider} = setup();
    await s.run({tracer: provider.getTracer('verify'), getTracer: (n, v, o) => provider.getTracer(n, v, o), at});
    const actual = calls.flat();
    const file = path.join(dir, `${name}.handoff.json`);
    if (process.env.VERIFY_UPDATE === '1') {
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(file, encodeFixture({config: CONFIG, spans: actual}) + '\n');
    }
    expect(decodeFixture(fs.readFileSync(file, 'utf8'))).toEqual({config: CONFIG, spans: actual});
  });
}
