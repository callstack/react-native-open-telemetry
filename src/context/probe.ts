import {context, createContextKey, type Context} from '@opentelemetry/api';
import {DEGRADED_ATTR, markDegraded} from './scope';

export {DEGRADED_ATTR, scopeAttributes} from './scope';

const KEY = createContextKey('com.callstack.probe');

const defaultStep = async (): Promise<Context> => {
  await null;
  return context.active();
};

export async function probeAsyncContext(step: () => Promise<Context> = defaultStep): Promise<boolean> {
  const after = await context.with(context.active().setValue(KEY, true), step);
  const ok = after.getValue(KEY) === true;
  if (!ok && markDegraded()) {
    console.error(
      `[react-native-open-telemetry] context did not survive \`await\`: native async/await was not downleveled, ` +
        `so spans after \`await\` will be roots (${DEGRADED_ATTR}=true). Use the Metro helper (withOtel) or transform async-to-generator.`,
    );
  }
  return ok;
}
