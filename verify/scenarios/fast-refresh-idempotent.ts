import {scenario} from '../harness/scenario';
import nestAfterAwait from './nest-after-await';

export default scenario('fast-refresh-idempotent', nestAfterAwait.run, {runners: ['e2e'], targets: ['android', 'ios']});
