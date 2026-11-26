import {useEffect, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {NitroModules} from 'react-native-nitro-modules';
import {startReactNativeSdk} from 'react-native-open-telemetry';
import {getOtel} from '../../src/native/otel';
import {at} from '../../verify/harness/scenario';
import {allScenarios} from '../../verify/scenarios';
import type {TestNative} from '../modules/test-native/src/TestNative.nitro';

const NO_FLUSH = new Set(['collector-down', 'flush-after-reload', 'background-flush']);
const TEST_MODE = process.env.OTEL_TEST_MODE === '1';

const g = globalThis as any;
g.__otelFirstPatch ??= {then: Promise.prototype.then, setTimeout: g.setTimeout};
const patchIdentity = () =>
  `${g.__otelFirstPatch.then === Promise.prototype.then && g.__otelFirstPatch.setTimeout === g.setTimeout ? 'same' : 'changed'} refreshes=${g.__otelRefreshes ?? 0}`;

async function runScenario(name: string) {
  const s = allScenarios().find(x => x.name === name)!;
  const sdk = startReactNativeSdk();
  await s.run({
    tracer: sdk.tracerProvider.getTracer('verify'),
    getTracer: (n, v, o) => sdk.tracerProvider.getTracer(n, v, o),
    at,
    native: NitroModules.createHybridObject<TestNative>('TestNative'),
  });
  if (!NO_FLUSH.has(name)) await sdk.forceFlush();
}

export function ScenariosScreen() {
  const [status, setStatus] = useState('');
  const [testMode, setTestMode] = useState<string>('');

  useEffect(() => {
    const otel = getOtel();
    setTestMode(otel ? `native testMode=${otel.initialize().testMode}` : 'native: no HybridObject');
  }, []);

  const [running, setRunning] = useState<string | null>(null);
  useEffect(() => {
    if (!running) return;
    runScenario(running).then(
      () => setStatus('done'),
      e => setStatus(`error ${String(e)}`),
    ).finally(() => setRunning(null));
  }, [running]);

  const [flushes, setFlushes] = useState(0);
  const flush = () => startReactNativeSdk().forceFlush().then(() => setFlushes(n => n + 1));

  const press = (name: string) => () => {
    setStatus(`running ${name}`);
    setRunning(name);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="native-test-mode">{testMode}</Text>
      {status === 'done' && <Text testID="scenario-done">done</Text>}
      {status.startsWith('error') && <Text testID="scenario-error">{status}</Text>}
      {TEST_MODE && (
        <View style={styles.chips}>
          <Pressable testID="flush" onPress={flush} style={styles.button}>
            <Text style={styles.chipText}>flush</Text>
          </Pressable>
          {/* DevSettings.reload() is a no-op in release builds; this is the native reload OTA updaters use */}
          <Pressable testID="reload" onPress={() => NitroModules.createHybridObject<TestNative>('TestNative').reload()} style={styles.button}>
            <Text style={styles.chipText}>reload</Text>
          </Pressable>
          {flushes > 0 && <Text testID={`flush-done-${flushes}`}>flushed {flushes}</Text>}
          <Text testID="patch-identity">{patchIdentity()}</Text>
        </View>
      )}
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
});
