// The package entry imports its setup (context patch), which withOtel runs before the app. A bare import in its own
// module: with inline requires, release Metro drops ScenariosScreen's import on iOS, where its only use is dead code.
import 'react-native-open-telemetry';
import {ScenariosScreen} from './src/ScenariosScreen';

export default function App() {
  return <ScenariosScreen />;
}
