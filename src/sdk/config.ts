import type {Attributes, TracerProvider} from '@opentelemetry/api';
import type {SpanProcessor} from '@opentelemetry/sdk-trace';

export interface SdkConfig {
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Attributes;
  exportConfig?: {url: string; headers?: Record<string, string>};
  spanProcessors?: SpanProcessor[];
}

export interface SdkHandle {
  tracerProvider: TracerProvider;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
