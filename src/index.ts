// Side effect: keeps ./setup in the bundle graph so Metro's runBeforeMainModule entry can run it.
import './setup';

export {startReactNativeSdk} from './sdk/start';
export type {SdkConfig, SdkHandle} from './sdk/config';
