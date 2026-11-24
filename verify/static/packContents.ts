export const REQUIRED = ['package.json', 'lib/', 'src/', 'nitrogen/', 'metro/', 'vite/', 'android/', 'ios/', 'Package.swift', 'ReactNativeOpenTelemetry.podspec', 'ReactNativeOpenTelemetryCore.podspec', 'app.plugin.js'];

/** Returns the required paths missing from the `npm pack --dry-run --json` file list. */
export function packContents(list: string[], required: string[] = REQUIRED): string[] {
  return required.filter(r =>
    r.endsWith('/') ? !list.some(p => p.startsWith(r)) : !list.includes(r),
  );
}
