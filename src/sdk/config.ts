import type {Attributes, TracerProvider} from '@opentelemetry/api';
import type {SpanProcessor} from '@opentelemetry/sdk-trace';

export interface SdkConfig {
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Attributes;
  /** `url` is the OTLP/HTTP traces endpoint, used as given (e.g. `https://collector:4318/v1/traces`, §4.4). */
  exportConfig?: {url: string; headers?: Record<string, string>};
  spanProcessors?: SpanProcessor[];
}

export interface SdkHandle {
  tracerProvider: TracerProvider;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}
