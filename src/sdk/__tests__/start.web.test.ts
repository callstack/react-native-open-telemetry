/**
 * @jest-environment jsdom
 */
import {context, ROOT_CONTEXT, trace, type ProxyTracerProvider} from '@opentelemetry/api';
import {InMemorySpanExporter, SimpleSpanProcessor} from '@opentelemetry/sdk-trace';
import {MARKER} from '../../context/patch';
import {contextManager} from '../../setup';
import pkg from '../../../package.json';
import {startReactNativeSdk} from '../start.web';

const CONFIG = {serviceName: 'shop', exportConfig: {url: 'https://c.example.com:4318/v1/traces', headers: {'x-api-key': 'k'}}};

// jsdom lacks TextEncoder (every browser has it); the proto serializer needs it.
(globalThis as any).TextEncoder ??= require('util').TextEncoder;

// Jest 30 always adds the `node` condition to require(); load the exporter's browser (fetch) build as a web bundler would.
jest.mock('@opentelemetry/exporter-trace-otlp-proto', () =>
  jest.requireActual(require.resolve('@opentelemetry/exporter-trace-otlp-proto').replace(/index\.cjs$/, 'platform/browser/index.cjs')),
);

let err: jest.SpyInstance;
let warn: jest.SpyInstance;
let fetchMock: jest.Mock;
beforeEach(() => {
  const marker = (globalThis as any)[MARKER];
  delete marker.handle;
  delete marker.warned;
  trace.disable();
  delete process.env.OTEL_TEST_MODE;
  fetchMock = jest.fn(async () => ({ok: true, status: 200, headers: {get: () => null}, text: async () => ''}));
  (globalThis as any).fetch = fetchMock;
  err = jest.spyOn(console, 'error').mockImplementation(() => {});
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const isNoop = (h: ReturnType<typeof startReactNativeSdk>) =>
  !h.tracerProvider.getTracer('t').startSpan('s').isRecording();

test('our context manager is the global one after start', () => {
  startReactNativeSdk(CONFIG);
  const ctx = ROOT_CONTEXT.setValue(Symbol('k'), 1);
  expect(context.with(ctx, () => contextManager.active())).toBe(ctx);
  expect(err).not.toHaveBeenCalled();
});

test('exports to the url as given, with the headers', async () => {
  const h = startReactNativeSdk(CONFIG);
  h.tracerProvider.getTracer('t').startSpan('s').end();
  await h.forceFlush();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [sent, init] = fetchMock.mock.calls[0];
  expect(sent).toBe(CONFIG.exportConfig.url);
  expect(init.headers).toMatchObject({'x-api-key': 'k', 'Content-Type': 'application/x-protobuf'});
  await h.shutdown();
});

test('missing exportConfig returns a no-op handle', () => {
  const h = startReactNativeSdk({serviceName: 'shop'});
  expect(isNoop(h)).toBe(true);
  expect(err).toHaveBeenCalledTimes(1);
  expect(startReactNativeSdk({serviceName: 'shop'})).toBe(h);
  expect(err).toHaveBeenCalledTimes(1);
});

test.each(['not a url', 'ftp://c.example.com', 'collector:4318'])('invalid url %s: one error and a no-op handle', url => {
  const h = startReactNativeSdk({...CONFIG, exportConfig: {url}});
  expect(isNoop(h)).toBe(true);
  expect(err).toHaveBeenCalledTimes(1);
  expect(String(err.mock.calls[0])).toMatch(/invalid exportConfig\.url/);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('second call returns the first handle with one warning', () => {
  const h = startReactNativeSdk(CONFIG);
  expect(startReactNativeSdk(CONFIG)).toBe(h);
  expect(startReactNativeSdk(CONFIG)).toBe(h);
  expect(warn).toHaveBeenCalledTimes(1);
});

test('resource, user processors and the global provider', () => {
  const exporter = new InMemorySpanExporter();
  const h = startReactNativeSdk({
    ...CONFIG,
    serviceVersion: '1.2.3',
    resourceAttributes: {'deployment.environment.name': 'prod'},
    spanProcessors: [new SimpleSpanProcessor({exporter})],
  });
  expect((trace.getTracerProvider() as ProxyTracerProvider).getDelegate()).toBe(h.tracerProvider);
  trace.getTracer('t').startSpan('s').end();
  const span = exporter.getFinishedSpans()[0]!;
  expect(span.resource.attributes).toEqual({
    'deployment.environment.name': 'prod',
    'service.name': 'shop',
    'service.version': '1.2.3',
    'telemetry.distro.name': 'react-native-open-telemetry',
    'telemetry.distro.version': pkg.version,
  });
});

test('test mode: 0a ids and no distro attributes', () => {
  process.env.OTEL_TEST_MODE = '1';
  const exporter = new InMemorySpanExporter();
  const h = startReactNativeSdk({...CONFIG, spanProcessors: [new SimpleSpanProcessor({exporter})]});
  h.tracerProvider.getTracer('t').startSpan('s').end();
  const span = exporter.getFinishedSpans()[0]!;
  expect(span.spanContext().traceId).toBe('0a' + '1'.padStart(30, '0'));
  expect(span.spanContext().spanId).toBe('0a' + '1'.padStart(14, '0'));
  expect(span.resource.attributes).toEqual({'service.name': 'shop'});
});
