import {NitroModules} from 'react-native-nitro-modules';
import type {Otel} from './Otel.nitro';

/** undefined when the HybridObject isn't registered (web, Jest, Expo Go). */
export function getOtel(): Otel | undefined {
  try {
    return NitroModules.hasHybridObject('Otel') ? NitroModules.createHybridObject<Otel>('Otel') : undefined;
  } catch {
    return undefined;
  }
}
