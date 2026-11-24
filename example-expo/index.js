import {registerRootComponent} from 'expo';
import {Platform} from 'react-native';
import {startReactNativeSdk} from 'react-native-open-telemetry';
import {ScenariosScreen} from '../example/src/ScenariosScreen';

// JS-fallback init: no native init in this app, so this call initializes native from the config (spec §4.4).
// No serviceVersion: the test-mode resource is service.name only (R2). Same collector and headers as the bare app.
startReactNativeSdk({
  serviceName: 'verify',
  exportConfig: {
    url: Platform.OS === 'android' ? 'http://10.0.2.2:4318' : 'http://localhost:4318',
    headers: {'x-api-key': 'test'}, // asserted by verify/e2e/export-headers.e2e.ts
  },
});

registerRootComponent(ScenariosScreen);
