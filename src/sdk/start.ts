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
  const seam = config && toSeamConfig(config);
  const result = native.initialize(seam);
  if (result.error) {
    if (result.alreadyInitialized) return noopHandle();
    if (config && !seam) {
      console.error(`${TAG} serviceName and exportConfig.url are required to initialize native; telemetry is off.`);
    } else {
      console.error(`${TAG} native init failed; telemetry is off: ${result.error}`);
    }
    return noopHandle();
  }
  if (result.alreadyInitialized && config?.exportConfig) {
    console.warn(`${TAG} native was initialized first; the JS exportConfig is ignored.`);
  }

  const provider = new TracerProvider({
    resource: emptyResource(),
    ...(result.testMode ? {idGenerator: sequentialIds('0a')} : {}),
    spanProcessors: [...(config?.spanProcessors ?? []), new NativeHandOffProcessor(native)],
  });
  return register(provider);
}

export const startReactNativeSdk = (config?: SdkConfig): SdkHandle => startOnce(start, config);
