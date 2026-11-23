import {context, createContextKey, type Context} from '@opentelemetry/api';
import {DEGRADED_ATTR, markDegraded} from './scope';

export {DEGRADED_ATTR, scopeAttributes} from './scope';

const KEY = createContextKey('com.callstack.probe');

// `await` here only keeps the context if the bundler downleveled async to generators (then the patched `then` runs).
const defaultStep = async (): Promise<Context> => {
  await null;
  return context.active();
};

/**
 * Startup probe (§6.1.4): does the active context survive `await`? On failure, logs once and flags the SDK's tracers
 * as degraded. `step` is injectable for tests.
 */
export async function probeAsyncContext(step: () => Promise<Context> = defaultStep): Promise<boolean> {
  const after = await context.with(context.active().setValue(KEY, true), step);
  const ok = after.getValue(KEY) === true;
  if (!ok && markDegraded()) {
    console.error(
      `[react-native-open-telemetry] context did not survive \`await\`: native async/await was not downleveled, ` +
        `so spans after \`await\` will be roots (${DEGRADED_ATTR}=true). Use the Metro/Vite helper or transform async-to-generator.`,
    );
  }
  return ok;
}
