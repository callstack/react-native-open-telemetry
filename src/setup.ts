import {context} from '@opentelemetry/api';
import {RNContextManager} from './context/RNContextManager';
import {MARKER, installContextPatch, type PatchMarker} from './context/patch';

// Runs before the app (Metro/Vite helpers). Reuse the marker's singleton so a re-evaluation (fast refresh,
// a second copy of the SDK) never makes a second context manager.
const existing: PatchMarker | undefined = (globalThis as any)[MARKER];
export const contextManager: RNContextManager = existing?.contextManager ?? new RNContextManager().enable();
installContextPatch(contextManager);
context.setGlobalContextManager(contextManager);
