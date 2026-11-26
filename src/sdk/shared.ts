import {trace} from '@opentelemetry/api';
import type {TracerProvider} from '@opentelemetry/sdk-trace';
import {MARKER, type PatchMarker} from '../context/patch';
import {probeAsyncContext} from '../context/probe';
import {stampScope} from '../context/scope';
import type {SdkConfig, SdkHandle} from './config';
import {noopHandle} from './noop';

export const TAG = '[react-native-open-telemetry]';

/** Stamps every tracer, makes `provider` the global one, starts the probe; returns the handle. */
export function register(provider: TracerProvider): SdkHandle {
  const getTracer = provider.getTracer.bind(provider);
  provider.getTracer = (name, version, options) => stampScope(getTracer(name, version, options));
  if (!trace.setGlobalTracerProvider(provider)) {
    console.error(`${TAG} another tracer provider is already registered; trace.getTracer() will not reach this SDK.`);
  }
  probeAsyncContext().catch(() => {});
  return {
    tracerProvider: provider,
    forceFlush: () => provider.forceFlush(),
    shutdown: () => provider.shutdown(),
  };
}

// On the marker (globalThis), so a fast-refresh re-evaluation of this module still finds the first handle.
type Marker = PatchMarker & {handle?: SdkHandle; warned?: boolean};

/** D10: the first call's handle wins; later calls get it back with one warning. Never throws. */
export function startOnce(start: (config?: SdkConfig) => SdkHandle, config?: SdkConfig): SdkHandle {
  const m: Marker = (globalThis as any)[MARKER];
  if (m.handle) {
    if (!m.warned) console.warn(`${TAG} startReactNativeSdk was already called; returning the first handle.`);
    m.warned = true;
    return m.handle;
  }
  try {
    m.handle = start(config);
  } catch (e) {
    console.error(`${TAG} start failed; telemetry is off.`, e);
    m.handle = noopHandle();
  }
  return m.handle;
}
