import { TurboModuleRegistry, type TurboModule } from "react-native";

type Carrier = {
  [key: string]: string;
};

export interface Spec extends TurboModule {
  setContext: (carrier: Carrier) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("OpenTelemetry");
