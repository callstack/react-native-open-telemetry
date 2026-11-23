import type {IdGenerator} from '@opentelemetry/sdk-trace';

export const isTestModeBuild = (): boolean =>
  typeof process !== 'undefined' && process.env?.OTEL_TEST_MODE === '1';

const hex = (prefix: string, n: number, len: number) => prefix + String(n).padStart(len - prefix.length, '0');

export function sequentialIds(prefix: '0a' | '0b'): IdGenerator & {reset(): void} {
  let t = 0;
  let s = 0;
  return {
    generateTraceId: () => hex(prefix, ++t, 32),
    generateSpanId: () => hex(prefix, ++s, 16),
    reset() {
      t = s = 0;
    },
  };
}
