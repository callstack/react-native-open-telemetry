import {registerRootComponent} from 'expo';
import {Platform} from 'react-native';
import {startReactNativeSdk} from 'react-native-open-telemetry';
import {ScenariosScreen} from '../example/src/ScenariosScreen';

startReactNativeSdk({
  serviceName: 'verify',
  exportConfig: {
    url: Platform.OS === 'android' ? 'http://10.0.2.2:4318/v1/traces' : 'http://localhost:4318/v1/traces',
    headers: {'x-api-key': 'test'},
  },
});

registerRootComponent(ScenariosScreen);
