require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

File.write(File.join(__dir__, "ios/RNOtel/PackageVersion.swift"),
           "let packageVersion = \"#{package["version"]}\"\n")

Pod::Spec.new do |s|
  s.name         = "ReactNativeOpenTelemetryCore"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/callstack/react-native-open-telemetry.git", :tag => "#{s.version}" }
  s.swift_version = "5.0"

  s.source_files = ["ios/Core/**/*.swift", "ios/RNOtel/**/*.swift"]

  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -package-name ReactNativeOpenTelemetry',
  }.merge(ENV['OTEL_TEST_MODE'] == '1' ? { 'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited) OTEL_TEST_MODE' } : {})

  spm_dependency(s,
    url: 'https://github.com/open-telemetry/opentelemetry-swift',
    requirement: { kind: 'exactVersion', version: '2.6.0' },
    products: ['OpenTelemetryProtocolExporterHTTP'])
  spm_dependency(s,
    url: 'https://github.com/open-telemetry/opentelemetry-swift-core',
    requirement: { kind: 'exactVersion', version: '2.6.0' },
    products: ['OpenTelemetrySdk'])
end
