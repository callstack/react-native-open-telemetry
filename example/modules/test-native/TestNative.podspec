# Example-only Nitro module (Task 26, R25): app native code using the public RNOtel API.
Pod::Spec.new do |s|
  s.name         = "TestNative"
  s.version      = "0.0.0"
  s.summary      = "Example-only HybridObject over RNOtel"
  s.homepage     = "https://github.com/callstack/react-native-open-telemetry"
  s.license      = "MIT"
  s.authors      = "Callstack"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/callstack/react-native-open-telemetry.git" }

  s.source_files = ["ios/**/*.swift"]
  # static libraries: the core and its SwiftPM modules land in the products root (see ReactNativeOpenTelemetry.podspec)
  s.pod_target_xcconfig = { 'SWIFT_INCLUDE_PATHS' => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}"' }

  load 'nitrogen/generated/ios/TestNative+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'ReactNativeOpenTelemetryCore'
  # builds after the adapter pod, whose script phase forwards the core's module map (static libraries)
  s.dependency 'ReactNativeOpenTelemetry'
  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
