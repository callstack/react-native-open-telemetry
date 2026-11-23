import {useEffect, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text} from 'react-native';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {SimpleSpanProcessor, TracerProvider} from '@opentelemetry/sdk-trace';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-proto';
import {getOtel} from '../../src/native/otel';
import {sequentialIds} from '../../src/internal/testMode';
import type {SeamSpan} from '../../src/native/Otel.nitro';
import {at} from '../../verify/harness/scenario';
import {decodeFixture} from '../../verify/harness/fixtureJson';
import {allScenarios} from '../../verify/scenarios';
import richSpan from '../../verify/fixtures/rich-span.handoff.json';

/** Must match COLLECTOR_PORT in verify/e2e/harness.ts. */
const COLLECTOR_PORT = 4318;
const COLLECTOR = `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${COLLECTOR_PORT}`;

// Phase 1: JS-direct export, the same provider setup as verify/jest/scenarios.test.ts.
async function runScenario(name: string) {
  const s = allScenarios().find(x => x.name === name)!;
  const provider = new TracerProvider({
    idGenerator: sequentialIds('0a'),
    resource: resourceFromAttributes({'service.name': 'verify'}),
    spanProcessors: [new SimpleSpanProcessor({exporter: new OTLPTraceExporter({url: `${COLLECTOR}/v1/traces`})})],
  });
  try {
    await s.run({tracer: provider.getTracer('verify'), getTracer: (n, v, o) => provider.getTracer(n, v, o), at});
    await provider.forceFlush();
  } finally {
    await provider.shutdown();
  }
}

export function ScenariosScreen() {
  const [status, setStatus] = useState('');
  const [testMode, setTestMode] = useState<string>('');

  useEffect(() => {
    const otel = getOtel();
    setTestMode(otel ? `native testMode=${otel.initialize().testMode}` : 'native: no HybridObject');
  }, []);

  const press = (name: string) => () => {
    setStatus(`running ${name}`);
    runScenario(name).then(
      () => setStatus('done'),
      e => setStatus(`error ${String(e)}`),
    );
  };

  const handOff = () => {
    const {spans} = decodeFixture(JSON.stringify(richSpan)) as {spans: SeamSpan[]};
    getOtel()!.handOff(spans);
    setStatus('handoff');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="native-test-mode">{testMode}</Text>
      {allScenarios().map(s => (
        <Pressable key={s.name} testID={`scenario-${s.name}`} onPress={press(s.name)} style={styles.button}>
          <Text>{s.name}</Text>
        </Pressable>
      ))}
      {/* hidden: driven by verify/e2e/tracer-bullet.e2e.ts */}
      <Pressable testID="tracer-bullet-handoff" onPress={handOff} style={styles.hidden}>
        <Text>tracer bullet</Text>
      </Pressable>
      {status === 'done' && <Text testID="scenario-done">done</Text>}
      {status === 'handoff' && <Text testID="tracer-bullet-done">handed off</Text>}
      {status.startsWith('error') && <Text testID="scenario-error">{status}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 24, paddingTop: 80, gap: 8},
  button: {padding: 12, backgroundColor: '#ddd'},
  // tappable for the e2e runner, invisible to people
  hidden: {opacity: 0.02, padding: 12},
});
