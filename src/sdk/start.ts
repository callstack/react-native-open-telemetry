import {emptyResource} from '@opentelemetry/resources';
import {TracerProvider} from '@opentelemetry/sdk-trace';
import '../setup';
import {NativeHandOffProcessor} from '../handoff/NativeHandOffProcessor';
import {attrs} from '../handoff/toSeamSpan';
import {sequentialIds} from '../internal/testMode';
import type {SeamConfig} from '../native/Otel.nitro';
import {getOtel} from '../native/otel';
import type {SdkConfig, SdkHandle} from './config';
import {noopHandle} from './noop';
import {register, startOnce, TAG} from './shared';

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
  return register(provider);
}

/** Attaches to native, or initializes it from `config` (§4.4). Never throws: failures give one error and a no-op handle. */
export const startReactNativeSdk = (config?: SdkConfig): SdkHandle => startOnce(start, config);
