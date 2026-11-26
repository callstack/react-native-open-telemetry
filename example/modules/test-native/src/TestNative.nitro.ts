import type {HybridObject} from 'react-native-nitro-modules';

export interface TestNative extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  doWork(traceparent: string, start: number[], end: number[]): string;
  reload(): void;
}
