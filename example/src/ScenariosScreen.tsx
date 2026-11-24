import {useEffect, useState} from 'react';
import {Platform, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {resourceFromAttributes} from '@opentelemetry/resources';
import {SimpleSpanProcessor, TracerProvider} from '@opentelemetry/sdk-trace';
import {OTLPTraceExporter} from '@opentelemetry/exporter-trace-otlp-proto';
// the package's entry imports its setup (context patch); withOtel runs it before the app
import 'react-native-open-telemetry';
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

  // The run starts after the commit that removed the previous scenario-done, so a stale marker never satisfies a wait.
  const [running, setRunning] = useState<string | null>(null);
  useEffect(() => {
    if (!running) return;
    runScenario(running).then(
      () => setStatus('done'),
      e => setStatus(`error ${String(e)}`),
    ).finally(() => setRunning(null));
  }, [running]);

  const press = (name: string) => () => {
    setStatus(`running ${name}`);
    setRunning(name);
  };

  const handOff = () => {
    const {spans} = decodeFixture(JSON.stringify(richSpan)) as {spans: SeamSpan[]};
    getOtel()!.handOff(spans);
    setStatus('handoff');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="native-test-mode">{testMode}</Text>
      {/* hidden: driven by verify/e2e/tracer-bullet.e2e.ts */}
      <Pressable testID="tracer-bullet-handoff" onPress={handOff} style={styles.hidden}>
        <Text>tracer bullet</Text>
      </Pressable>
      {status === 'done' && <Text testID="scenario-done">done</Text>}
      {status === 'handoff' && <Text testID="tracer-bullet-done">handed off</Text>}
      {status.startsWith('error') && <Text testID="scenario-error">{status}</Text>}
      {/* compact chips: everything the e2e runner taps must fit one small CI screen, no scrolling */}
      <View style={styles.chips}>
        {allScenarios().map(s => (
          <Pressable key={s.name} testID={`scenario-${s.name}`} onPress={press(s.name)} style={styles.button}>
            <Text style={styles.chipText}>{s.name}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, paddingTop: 40, gap: 4},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  button: {padding: 4, backgroundColor: '#ddd'},
  chipText: {fontSize: 10},
  // tappable for the e2e runner, invisible to people
  hidden: {opacity: 0.02, padding: 4},
});
