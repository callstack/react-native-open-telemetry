export const REQUIRED = ['package.json', 'lib/', 'src/', 'nitrogen/', 'metro/', 'android/', 'ios/', 'ReactNativeOpenTelemetry.podspec', 'ReactNativeOpenTelemetryCore.podspec', 'app.plugin.js', 'react-native.config.js'];

export function packContents(list: string[], required: string[] = REQUIRED): string[] {
  return required.filter(r =>
    r.endsWith('/') ? !list.some(p => p.startsWith(r)) : !list.includes(r),
  );
}
