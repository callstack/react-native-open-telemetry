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

  s.source_files = ["ios/Adapter/**/*.swift"]

  core_map = '${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore/ReactNativeOpenTelemetryCore.modulemap'
  s.script_phase = {
    :name => 'Forward the core module map',
    :execution_position => :before_compile,
    :always_out_of_date => '1',
    :script => %Q{set -e
if [ -f "${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore.modulemap" ]; then
  mkdir -p "${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore"
  echo 'extern module ReactNativeOpenTelemetryCore "../ReactNativeOpenTelemetryCore.modulemap"' > "#{core_map}"
fi
},
  }
  s.pod_target_xcconfig = {
    'OTHER_SWIFT_FLAGS' => '$(inherited) -package-name ReactNativeOpenTelemetry',
    'SWIFT_INCLUDE_PATHS' => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}"',
  }

  load 'nitrogen/generated/ios/ReactNativeOpenTelemetry+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'ReactNativeOpenTelemetryCore', s.version.to_s
  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
