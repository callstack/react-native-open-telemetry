require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "ReactNativeOpenTelemetry"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/callstack/react-native-open-telemetry.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/Core/**/*.swift",
    "ios/Adapter/**/*.swift",
  ]

  # Test mode is a build flag, never API: `OTEL_TEST_MODE=1 pod install`.
  if ENV['OTEL_TEST_MODE'] == '1'
    s.pod_target_xcconfig = {
      'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited) OTEL_TEST_MODE',
    }
  end

  # Adds nitrogen/generated/ios/** and nitrogen/generated/shared/**.
  load 'nitrogen/generated/ios/ReactNativeOpenTelemetry+autolinking.rb'
  add_nitrogen_files(s)

  # opentelemetry-swift 2.6 moved OpenTelemetryApi/OpenTelemetrySdk into opentelemetry-swift-core.
  spm_dependency(s,
    url: 'https://github.com/open-telemetry/opentelemetry-swift',
    requirement: { kind: 'upToNextMinorVersion', minimumVersion: '2.6.0' },
    products: ['OpenTelemetryProtocolExporterHTTP'])
  spm_dependency(s,
    url: 'https://github.com/open-telemetry/opentelemetry-swift-core',
    requirement: { kind: 'upToNextMinorVersion', minimumVersion: '2.6.0' },
    products: ['OpenTelemetrySdk'])

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
