import { AppRegistry } from 'react-native';
import { name as appName } from '../app.json';
import App from '../src/App';

AppRegistry.registerComponent(appName, () => App);

AppRegistry.runApplication(appName, {
  initialProps: {},
  rootTag: document.getElementById('root')
});
