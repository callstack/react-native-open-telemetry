import type {IdGenerator} from '@opentelemetry/sdk-trace';

// The plain `process.env.OTEL_TEST_MODE` form is what a Babel plugin inlines at bundle time; a browser bundle without
// it has no `process`, hence the catch.
export const isTestModeBuild = (): boolean => {
  try {
    return process.env.OTEL_TEST_MODE === '1';
  } catch {
    return false;
  }
};

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
