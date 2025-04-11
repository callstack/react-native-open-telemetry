import type { Attributes, HrTime, SpanContext, SpanKind, SpanStatus } from "@opentelemetry/api";
import type { InstrumentationScope } from '@opentelemetry/core';
import type { ScopeMetrics } from "@opentelemetry/sdk-metrics";
import { TurboModuleRegistry, type TurboModule } from "react-native";

export interface Spec extends TurboModule {
  exportTraces(
    spans: {
      name: string;
      spanContext: SpanContext;
      status: SpanStatus;
      startTime: HrTime;
      endTime: HrTime;
      kind: SpanKind;
      attributes: Attributes;
      parentSpanId?: string;
      ended: boolean;
      instrumentationScope: InstrumentationScope;
    }[],
  ): void;
  exportMetrics(metrics: ScopeMetrics[]): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("OpenTelemetry");
