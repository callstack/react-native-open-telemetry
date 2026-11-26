import {context} from '@opentelemetry/api';
import {RNContextManager} from './context/RNContextManager';
import {MARKER, installContextPatch, type PatchMarker} from './context/patch';

const existing: PatchMarker | undefined = (globalThis as any)[MARKER];
export const contextManager: RNContextManager = existing?.contextManager ?? new RNContextManager().enable();
installContextPatch(contextManager);
if (!context.setGlobalContextManager(contextManager) && !existing) {
  console.error('[react-native-open-telemetry] another context manager is already registered; spans may not nest.');
}
