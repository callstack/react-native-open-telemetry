require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The Nitro adapter (Swift with C++ interop) over the pure Swift core pod (spec §4.2).
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

  # The core pod uses spm_dependency, so in a static-library build React Native's spm.rb builds it straight into the
  # products root, and rewrites the app's module map path to match, but not this pod's: CocoaPods still points it at
  # `<root>/ReactNativeOpenTelemetryCore/ReactNativeOpenTelemetryCore.modulemap`. Forward that path to the real map, and
  # search the root for the core's swiftmodule. Unused (and harmless) with frameworks.
  # ponytail: drop when RN's spm.rb rewrites pod-target xcconfigs too.
  core_map = '${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore/ReactNativeOpenTelemetryCore.modulemap'
  s.script_phase = {
    :name => 'Forward the core module map',
    :execution_position => :before_compile,
    :always_out_of_date => '1', # no inputs: run every build on purpose (silences the Xcode warning)
    :script => %Q{set -e
if [ -f "${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore.modulemap" ]; then
  mkdir -p "${PODS_CONFIGURATION_BUILD_DIR}/ReactNativeOpenTelemetryCore"
  echo 'extern module ReactNativeOpenTelemetryCore "../ReactNativeOpenTelemetryCore.modulemap"' > "#{core_map}"
fi
},
  }
  s.pod_target_xcconfig = {
    # `package` declarations of the core are shared through one Swift package name.
    'OTHER_SWIFT_FLAGS' => '$(inherited) -package-name ReactNativeOpenTelemetry',
    'SWIFT_INCLUDE_PATHS' => '$(inherited) "${PODS_CONFIGURATION_BUILD_DIR}"',
  }

  # Adds nitrogen/generated/ios/** and nitrogen/generated/shared/**.
  load 'nitrogen/generated/ios/ReactNativeOpenTelemetry+autolinking.rb'
  add_nitrogen_files(s)

  # JsReadableSpan imports opentelemetry-swift too. No spm_dependency here (it would move this pod's module map, see
  # above): the core pod's SwiftPM products are built into the products root, which SWIFT_INCLUDE_PATHS searches.
  s.dependency 'ReactNativeOpenTelemetryCore', s.version.to_s
  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
