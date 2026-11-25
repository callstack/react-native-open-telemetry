import type {HybridObject} from 'react-native-nitro-modules';

/** Example-only (Task 26): app native code that parents its spans with the public `RNOtel` helpers. */
export interface TestNative extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  /** Starts and ends `native.work` under `traceparent` ('' = a root) at `start`/`end` ([s, ns]), returns its traceparent. */
  doWork(traceparent: string, start: number[], end: number[]): string;
  /** Reloads the JS app natively, as OTA updaters do; `DevSettings.reload()` is a no-op in release (Task 27). */
  reload(): void;
}
