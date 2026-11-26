import type {HybridObject} from 'react-native-nitro-modules';

export type HrTime = number[];
export interface SeamSpanContext { traceId: string; spanId: string; traceFlags: number; traceState?: string }
export type AttrValue = string | number | boolean | string[] | number[] | boolean[];
export interface SeamAttribute { key: string; value: AttrValue }
export interface SeamEvent { name: string; time: HrTime; attributes: SeamAttribute[] }
export interface SeamLink { context: SeamSpanContext; attributes: SeamAttribute[] }
export interface SeamScope { name: string; version?: string; schemaUrl?: string; attributes: SeamAttribute[] }
export interface SeamStatus { code: number; message?: string }
export interface SeamSpan {
  context: SeamSpanContext; parentSpanId?: string; name: string; kind: number;
  start: HrTime; end: HrTime; attributes: SeamAttribute[]; events: SeamEvent[];
  links: SeamLink[]; status: SeamStatus; scope: SeamScope;
}
export interface SeamConfig {
  serviceName: string; serviceVersion?: string; resourceAttributes: SeamAttribute[];
  exportUrl: string; exportHeaders: SeamAttribute[];
}
export interface SeamInitResult { alreadyInitialized: boolean; testMode: boolean; error?: string }
export interface Otel extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  initialize(config?: SeamConfig): SeamInitResult;
  handOff(spans: SeamSpan[]): void;
  flush(timeoutMs: number): Promise<void>;
}
