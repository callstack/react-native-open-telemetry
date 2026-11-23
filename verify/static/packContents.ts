// vite/ joins with Task 22, which creates it. Package.swift (Task 18) is listed by spec §9.4 stage 1.
export const REQUIRED = ['package.json', 'lib/', 'src/', 'nitrogen/', 'metro/', 'android/', 'ios/', 'Package.swift', 'ReactNativeOpenTelemetry.podspec'];

/** Returns the required paths missing from the `npm pack --dry-run --json` file list. */
export function packContents(list: string[], required: string[] = REQUIRED): string[] {
  return required.filter(r =>
    r.endsWith('/') ? !list.some(p => p.startsWith(r)) : !list.includes(r),
  );
}
