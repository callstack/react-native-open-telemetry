import {trace, type ProxyTracerProvider} from '@opentelemetry/api';
import {InMemorySpanExporter, SimpleSpanProcessor} from '@opentelemetry/sdk-trace';
import type {Otel, SeamConfig, SeamSpan} from '../../native/Otel.nitro';
import {MARKER} from '../../context/patch';
import {DEGRADED_ATTR, markDegraded} from '../../context/scope';
import {getOtel} from '../../native/otel';
import {startReactNativeSdk} from '../start';

jest.mock('../../native/otel', () => ({getOtel: jest.fn()}));

const CONFIG = {serviceName: 'shop', exportConfig: {url: 'https://collector.example.com:4318/v1/traces'}};

function fakeOtel({initialized = false, testMode = false, error}: {initialized?: boolean; testMode?: boolean; error?: string} = {}) {
  const calls: (SeamConfig | undefined)[] = [];
  const spans: SeamSpan[] = [];
  const otel = {
    initialize(cfg?: SeamConfig) {
      calls.push(cfg);
      if (error) return {alreadyInitialized: initialized, testMode, error};
      if (initialized) return {alreadyInitialized: true, testMode};
      if (!cfg) return {alreadyInitialized: false, testMode, error: 'no config'};
      initialized = true;
      return {alreadyInitialized: false, testMode};
    },
    handOff: (s: SeamSpan[]) => spans.push(...s),
    flush: async () => {},
  } as unknown as Otel;
  jest.mocked(getOtel).mockReturnValue(otel);
  return {calls, spans};
}

let err: jest.SpyInstance;
let warn: jest.SpyInstance;
beforeEach(() => {
  const marker = (globalThis as any)[MARKER];
  delete marker.handle;
  delete marker.warned;
  trace.disable();
  jest.mocked(getOtel).mockReset();
  err = jest.spyOn(console, 'error').mockImplementation(() => {});
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const isNoop = (h: ReturnType<typeof startReactNativeSdk>) =>
  !h.tracerProvider.getTracer('t').startSpan('s').isRecording();

test('attaches when native is initialized', () => {
  const {calls, spans} = fakeOtel({initialized: true});
  const h = startReactNativeSdk(CONFIG);
  expect(calls).toHaveLength(1);
  expect(warn).toHaveBeenCalledTimes(1); // exportConfig ignored
  h.tracerProvider.getTracer('t').startSpan('s').end();
  expect(spans.map(s => s.name)).toEqual(['s']);
  expect(err).not.toHaveBeenCalled();
});

test('initializes native when it is not', () => {
  const {calls, spans} = fakeOtel();
  const h = startReactNativeSdk({
    serviceName: 'shop',
    serviceVersion: '1.2.3',
    resourceAttributes: {'deployment.environment.name': 'prod', n: 3, dropped: [1, 'x'] as any},
    exportConfig: {url: 'https://collector.example.com:4318/v1/traces', headers: {'x-api-key': 'k'}},
  });
  expect(calls).toEqual([
    {
      serviceName: 'shop',
      serviceVersion: '1.2.3',
      resourceAttributes: [
        {key: 'deployment.environment.name', value: 'prod'},
        {key: 'n', value: 3},
      ],
      exportUrl: 'https://collector.example.com:4318/v1/traces',
      exportHeaders: [{key: 'x-api-key', value: 'k'}],
    },
  ]);
  expect(warn).not.toHaveBeenCalled();
  h.tracerProvider.getTracer('t').startSpan('s').end();
  expect(spans).toHaveLength(1);
});

test('no native module returns a no-op handle and logs once', async () => {
  jest.mocked(getOtel).mockReturnValue(undefined);
  const h = startReactNativeSdk(CONFIG);
  expect(err).toHaveBeenCalledTimes(1);
  expect(isNoop(h)).toBe(true);
  await h.forceFlush();
  await h.shutdown();
  expect(startReactNativeSdk(CONFIG)).toBe(h);
  expect(err).toHaveBeenCalledTimes(1);
});

test('init error returns a no-op handle and logs once', () => {
  fakeOtel({error: 'invalid exportUrl'});
  const h = startReactNativeSdk(CONFIG);
  expect(err).toHaveBeenCalledTimes(1);
  expect(String(err.mock.calls[0])).toMatch(/invalid exportUrl/);
  expect(isNoop(h)).toBe(true);
});

test('a partial config names the missing fields, not native\'s "no config"', () => {
  const {calls} = fakeOtel();
  expect(isNoop(startReactNativeSdk({serviceName: 'shop'}))).toBe(true);
  expect(calls).toEqual([undefined]);
  expect(err).toHaveBeenCalledTimes(1);
  expect(String(err.mock.calls[0])).toMatch(/serviceName and exportConfig\.url are required/);
});

test('a failed native-first init (sticky, R16) was reported by native: no second report', () => {
  fakeOtel({initialized: true, error: 'invalid exportUrl'});
  const h = startReactNativeSdk();
  expect(err).not.toHaveBeenCalled();
  expect(isNoop(h)).toBe(true);
});

test('never throws on missing config', () => {
  fakeOtel();
  expect(isNoop(startReactNativeSdk())).toBe(true);
  expect(err).toHaveBeenCalledTimes(1);

  delete (globalThis as any)[MARKER].handle;
  jest.mocked(getOtel).mockImplementation(() => {
    throw new Error('HybridObject constructor failed');
  });
  expect(isNoop(startReactNativeSdk(CONFIG))).toBe(true);
  expect(err).toHaveBeenCalledTimes(2);
});

test('second call returns the first handle with one warning', () => {
  fakeOtel({initialized: true});
  const h = startReactNativeSdk();
  expect(startReactNativeSdk()).toBe(h);
  expect(startReactNativeSdk()).toBe(h);
  expect(warn).toHaveBeenCalledTimes(1);
  // a fast-refresh re-evaluation of the SDK module still returns it
  jest.isolateModules(() => expect(require('../start').startReactNativeSdk()).toBe(h));
});

test('user span processors still see spans', () => {
  const {spans} = fakeOtel({initialized: true});
  const exporter = new InMemorySpanExporter();
  const h = startReactNativeSdk({spanProcessors: [new SimpleSpanProcessor({exporter})]});
  h.tracerProvider.getTracer('t').startSpan('s').end();
  expect(exporter.getFinishedSpans().map(s => s.name)).toEqual(['s']);
  expect(spans).toHaveLength(1);
});

test('test-mode native gives 0a ids', () => {
  fakeOtel({initialized: true, testMode: true});
  const span = startReactNativeSdk().tracerProvider.getTracer('t').startSpan('s');
  expect(span.spanContext().traceId).toBe('0a' + '1'.padStart(30, '0'));
  expect(span.spanContext().spanId).toBe('0a' + '1'.padStart(14, '0'));
});

test('global provider is the returned provider, its tracers carry the degraded flag', () => {
  fakeOtel({initialized: true});
  const h = startReactNativeSdk();
  expect((trace.getTracerProvider() as ProxyTracerProvider).getDelegate()).toBe(h.tracerProvider);
  const scope = (h.tracerProvider.getTracer('t') as any).instrumentationScope;
  expect(scope.attributes ?? {}).toEqual({});
  markDegraded();
  expect(scope.attributes).toEqual({[DEGRADED_ATTR]: true});
  expect((trace.getTracer('later') as any).instrumentationScope.attributes).toEqual({[DEGRADED_ATTR]: true});
});
