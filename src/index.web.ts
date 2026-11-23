// Side effect: registers the context manager and patch before the app runs.
import './setup';

export {startReactNativeSdk} from './sdk/start.web';
export type {SdkConfig, SdkHandle} from './sdk/config';
