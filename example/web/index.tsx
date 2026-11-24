import {AppRegistry} from 'react-native';
import {startReactNativeSdk} from 'react-native-open-telemetry';
import {ScenariosScreen} from '../src/ScenariosScreen';

// Web init: the first call configures the SDK; ScenariosScreen's later `startReactNativeSdk()` calls get this handle.
// The fake collector (verify/harness/collector.ts) listens on 4318 and answers CORS.
startReactNativeSdk({serviceName: 'verify', exportConfig: {url: 'http://localhost:4318', headers: {'x-api-key': 'test'}}});

AppRegistry.registerComponent('main', () => ScenariosScreen);
AppRegistry.runApplication('main', {rootTag: document.getElementById('root')});
