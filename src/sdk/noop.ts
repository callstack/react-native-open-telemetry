import {ProxyTracerProvider} from '@opentelemetry/api';
import type {SdkHandle} from './config';

/** A delegate-less proxy hands out no-op tracers. */
export const noopHandle = (): SdkHandle => ({
  tracerProvider: new ProxyTracerProvider(),
  forceFlush: async () => {},
  shutdown: async () => {},
});
