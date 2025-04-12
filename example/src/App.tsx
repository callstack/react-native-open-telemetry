import { Text, View, StatusBar, Pressable } from "react-native";
import { openTelemetrySDK } from "react-native-open-telemetry";

const sdk = openTelemetrySDK({
  // url: "http://localhost:4317", // Mobile
  url: "http://localhost:4318", // Web
  debug: true,
  name: "MyExampleApp",
  version: "1.0.0-alpha",
  environment: "development",
});

const tracer = sdk.trace.getTracer("my-js-tracer");
const meter = sdk.metrics.getMeter("my-js-meter", "1.0");
const counter = meter.createCounter("my-js-counter", {
  description: "A counter metric for my JS app",
});

export default function App() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      <StatusBar />

      <Pressable
        style={{ padding: 16, backgroundColor: "lightgray", borderRadius: 8 }}
        onPress={async () => {
          console.log("Starting a long, parent span...");
          const parentSpan = tracer.startSpan("my-js-homepage-span");
          const ctx = sdk.trace.setSpan(sdk.context.active(), parentSpan);
          parentSpan.setAttributes({
            platform: "js",
            userId: 123,
            userType: "admin",
          });

          const childSpan = tracer.startSpan(
            "my-js-homepage-child-span",
            { attributes: { type: "child" } },
            ctx
          );
          childSpan.end();

          // sleep for a random 1-3 seconds
          const sleepTime = Math.floor(Math.random() * 3000) + 1000;
          console.log(`Sleeping for ${sleepTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, sleepTime));

          parentSpan.end();
          console.log("Span ended");
        }}
      >
        <Text>Start a span</Text>
      </Pressable>

      <Pressable
        style={{ padding: 16, backgroundColor: "lightgray", borderRadius: 8 }}
        onPress={() => {
          console.log("Incrementing counter by 1");
          counter.add(1, {
            platform: "js",
            userId: "test-user-id",
            plan: Math.random() < 0.5 ? "basic" : "paid",
          });
        }}
      >
        <Text>Increment counter</Text>
      </Pressable>
    </View>
  );
}
