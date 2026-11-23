import {scenario} from '../harness/scenario';
import nestAfterAwait from './nest-after-await';

/**
 * Fast refresh does not stack the context patch (§6.1.3, Task 27): after two fast refreshes the
 * `nest-after-await` body produces exactly its usual output (same shape, one `child` under `parent`).
 */
export default scenario('fast-refresh-idempotent', nestAfterAwait.run, {runners: ['e2e'], pending: true});
