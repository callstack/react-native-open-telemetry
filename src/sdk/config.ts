import type {Attributes, TracerProvider} from '@opentelemetry/api';
import type {SpanProcessor} from '@opentelemetry/sdk-trace';

export interface SdkConfig {
  serviceName?: string;
  serviceVersion?: string;
  resourceAttributes?: Attributes;
  /** `url` is the OTLP base URL; `/v1/traces` is appended unless present (§4.4). */
  exportConfig?: {url: string; headers?: Record<string, string>};
  spanProcessors?: SpanProcessor[];
}

export interface SdkHandle {
  tracerProvider: TracerProvider;
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

/** One endpoint meaning on every platform (§4.4). Mobile passes the base URL; native applies the same rule. */
export function tracesUrl(url: string): string {
  const base = url.replace(/\/+$/, '');
  return base.endsWith('/v1/traces') ? base : base + '/v1/traces';
}
