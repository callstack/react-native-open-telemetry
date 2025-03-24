import OpenTelemetry from './NativeOpenTelemetry';

export function multiply(a: number, b: number): number {
  return OpenTelemetry.multiply(a, b);
}
