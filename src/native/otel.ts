import {NitroModules} from 'react-native-nitro-modules';
import type {Otel} from './Otel.nitro';

export function getOtel(): Otel | undefined {
  return NitroModules.hasHybridObject('Otel') ? NitroModules.createHybridObject<Otel>('Otel') : undefined;
}
