import { Text, View, StatusBar, Pressable } from "react-native";
import { openTelemetrySDK } from "react-native-open-telemetry";

const sdk = openTelemetrySDK({
  // Use '10.0.2.2' instead of 'localhost' on Android emulators
  url: "http://localhost:4318",
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

          tracer.startActiveSpan("my-js-homepage-span", async (parentSpan) => {
            parentSpan.setAttributes({
              platform: "js",
              userId: 123,
              userType: "admin",
            });

            const childSpan = tracer.startSpan(
              "my-js-homepage-child-span",
              { attributes: { type: "child" } },
            );
            childSpan.end();

            // sleep for a random 1-3 seconds
            const sleepTime = Math.floor(Math.random() * 3000) + 1000;
            console.log(`Sleeping for ${sleepTime}ms`);
            await new Promise((resolve) => setTimeout(resolve, sleepTime));

            console.log("Span ended");
            parentSpan.end();
          });

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

      <Pressable
        style={{ padding: 16, backgroundColor: "lightgray", borderRadius: 8 }}
        onPress={() => {
          fetch("https://api.weatherstack.com/current?query=Portland")
            .then((response) => response.json())
            .then(data => console.log(data))
            .catch(error => console.error(error))
        }}
      >
        <Text>Fetch weather</Text>
      </Pressable>
    </View>
  );
}
