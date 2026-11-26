import {ProxyTracerProvider} from '@opentelemetry/api';
import type {SdkHandle} from './config';

export const noopHandle = (): SdkHandle => ({
  tracerProvider: new ProxyTracerProvider(),
  forceFlush: async () => {},
  shutdown: async () => {},
});
