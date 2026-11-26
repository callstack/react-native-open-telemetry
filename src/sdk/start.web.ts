import '../setup';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-proto';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {BatchSpanProcessor, TracerProvider} from '@opentelemetry/sdk-trace';
import {isTestModeBuild, sequentialIds} from '../internal/testMode';
import pkg from 'react-native-open-telemetry/package.json';
import type {SdkConfig, SdkHandle} from './config';
import {noopHandle} from './noop';
import {register, startOnce, TAG} from './shared';

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname !== '';
  } catch {
    return false;
  }
}

function start(config: SdkConfig | undefined): SdkHandle {
  if (!config?.serviceName || !config.exportConfig?.url) {
    console.error(`${TAG} serviceName and exportConfig.url are required on web; telemetry is off.`);
    return noopHandle();
  }
  if (!isHttpUrl(config.exportConfig.url)) {
    console.error(`${TAG} invalid exportConfig.url "${config.exportConfig.url}": expected http(s)://host[:port]; telemetry is off.`);
    return noopHandle();
  }
  const testMode = isTestModeBuild();
  const {serviceName, serviceVersion, resourceAttributes, exportConfig, spanProcessors = []} = config;
  const resource = resourceFromAttributes({
    ...resourceAttributes,
    'service.name': serviceName,
    ...(serviceVersion ? {'service.version': serviceVersion} : {}),
    ...(testMode ? {} : {'telemetry.distro.name': 'react-native-open-telemetry', 'telemetry.distro.version': pkg.version}),
  });
  const exporter = new OTLPTraceExporter({url: exportConfig.url, headers: exportConfig.headers});
  return register(
    new TracerProvider({
      resource,
      ...(testMode ? {idGenerator: sequentialIds('0a')} : {}),
      spanProcessors: [...spanProcessors, new BatchSpanProcessor({exporter})],
    }),
  );
}

export const startReactNativeSdk = (config?: SdkConfig): SdkHandle => startOnce(start, config);
