// Package.swift joins with Task 18 and vite/ with Task 22, which create them.
export const REQUIRED = ['package.json', 'lib/', 'src/', 'nitrogen/', 'metro/', 'android/', 'ios/', 'ReactNativeOpenTelemetry.podspec'];

/** Returns the required paths missing from the `npm pack --dry-run --json` file list. */
export function packContents(list: string[], required: string[] = REQUIRED): string[] {
  return required.filter(r =>
    r.endsWith('/') ? !list.some(p => p.startsWith(r)) : !list.includes(r),
  );
}
