import {trace} from '@opentelemetry/api';
import {emptyResource} from '@opentelemetry/resources';
import {TracerProvider} from '@opentelemetry/sdk-trace';
import '../setup';
import {MARKER, type PatchMarker} from '../context/patch';
import {probeAsyncContext} from '../context/probe';
import {stampScope} from '../context/scope';
import {NativeHandOffProcessor} from '../handoff/NativeHandOffProcessor';
import {attrs} from '../handoff/toSeamSpan';
import {sequentialIds} from '../internal/testMode';
import type {SeamConfig} from '../native/Otel.nitro';
import {getOtel} from '../native/otel';
import type {SdkConfig, SdkHandle} from './config';
import {noopHandle} from './noop';

const TAG = '[react-native-open-telemetry]';

/** Undefined unless there is enough to initialize native; native then reports the missing config. */
function toSeamConfig(c: SdkConfig): SeamConfig | undefined {
  if (!c.serviceName || !c.exportConfig?.url) return undefined;
  return {
    serviceName: c.serviceName,
    ...(c.serviceVersion ? {serviceVersion: c.serviceVersion} : {}),
    resourceAttributes: attrs(c.resourceAttributes),
    exportUrl: c.exportConfig.url,
    exportHeaders: attrs(c.exportConfig.headers),
  };
}

function start(config: SdkConfig | undefined): SdkHandle {
  let native;
  try {
    native = getOtel();
  } catch (e) {
    console.error(`${TAG} the native Otel module failed to load; telemetry is off.`, e);
    return noopHandle();
  }
  if (!native) {
    console.error(`${TAG} native module not found (Expo Go or a build without it); telemetry is off.`);
    return noopHandle();
  }
  const result = native.initialize(config && toSeamConfig(config));
  if (result.error) {
    console.error(`${TAG} native init failed; telemetry is off: ${result.error}`);
    return noopHandle();
  }
  if (result.alreadyInitialized && config?.exportConfig) {
    console.warn(`${TAG} native was initialized first; the JS exportConfig is ignored.`);
  }

  // Resource is empty: native owns it. Sampler: upstream default ParentBased(AlwaysOn). Timing: upstream (§4.3 Clock).
  const provider = new TracerProvider({
    resource: emptyResource(),
    ...(result.testMode ? {idGenerator: sequentialIds('0a')} : {}),
    spanProcessors: [...(config?.spanProcessors ?? []), new NativeHandOffProcessor(native)],
  });
  const getTracer = provider.getTracer.bind(provider);
  provider.getTracer = (name, version, options) => stampScope(getTracer(name, version, options));
  if (!trace.setGlobalTracerProvider(provider)) {
    console.error('[react-native-open-telemetry] another tracer provider is already registered; trace.getTracer() will not reach this SDK.');
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

/** Attaches to native, or initializes it from `config` (§4.4). Never throws: failures give one error and a no-op handle. */
export function startReactNativeSdk(config?: SdkConfig): SdkHandle {
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
