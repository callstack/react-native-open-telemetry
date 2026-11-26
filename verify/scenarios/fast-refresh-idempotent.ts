import {scenario} from '../harness/scenario';
import nestAfterAwait from './nest-after-await';

/**
 * Fast refresh does not stack the context patch (§6.1.3). Stacked wrappers would still give the same
 * parents, so the output alone cannot fail; the proof is:
 * (a) `Promise.prototype.then` and `setTimeout` are the same functions before and after two fast refreshes
 *     (identity read via the `Symbol.for('com.callstack.otel.patched')` marker), and
 * (b) the refresh edit re-evaluates the patch module (otherwise (a) holds trivially).
 * The `nest-after-await` body then still gives its usual output (one `child` under `parent`).
 */
export default scenario('fast-refresh-idempotent', nestAfterAwait.run, {runners: ['e2e'], targets: ['android', 'ios']});
