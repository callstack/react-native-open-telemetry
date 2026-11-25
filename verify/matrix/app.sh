#!/usr/bin/env bash
set -euo pipefail

die() { echo "app.sh: $*" >&2; exit 1; }
edit() { perl -0pi -e "$2" "$1"; grep -qF -- "$3" "$1" || die "could not edit $1 (template changed?)"; }

bare() {
  local rn tmp old
  rn=$(npm view "react-native@$1" version --json | jq -r 'if type == "array" then .[-1] else . end')
  [ -n "$rn" ] && [ "$rn" != null ] || die "no react-native version matches '$1'"
  echo "example: React Native $rn"
  tmp=$(mktemp -d)
  old=$tmp/old
  npx --yes @react-native-community/cli@20.2.0 init OpenTelemetryExample --version "$rn" --directory "$tmp/app" \
    --package-name opentelemetry.example --skip-install --install-pods false --skip-git-init
  cd example
  mkdir "$old"
  mv android ios "$old/"
  cp -R "$tmp/app/android" "$tmp/app/ios" .

  node -e '
    const fs = require("fs");
    const [app, tpl] = process.argv.slice(1).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
    for (const k of ["dependencies", "devDependencies"]) {
      for (const d of Object.keys(app[k])) if (/^@react-native(-community)?\//.test(d)) delete app[k][d];
      Object.assign(app[k], tpl[k]);
    }
    app.dependencies["react-dom"] = tpl.dependencies.react;
    fs.writeFileSync(process.argv[1], JSON.stringify(app, null, 2) + "\n");
  ' package.json "$tmp/app/package.json"

  local java=android/app/src/main/java/opentelemetry/example
  cp "$old/$java/OtelInit.kt" "$java/"
  edit "$java/MainApplication.kt" 's/(super\.onCreate\(\)\n)/$1    startOtel()\n/' 'startOtel()'
  mkdir -p android/app/src/main/res/xml
  cp "$old/android/app/src/main/res/xml/network_security_config.xml" android/app/src/main/res/xml/
  edit android/app/src/main/AndroidManifest.xml \
    's/(android:name="\.MainApplication")/$1\n      android:networkSecurityConfig="\@xml\/network_security_config"/' \
    'networkSecurityConfig'
  edit android/build.gradle 's/minSdkVersion = \d+/minSdkVersion = 26/' 'minSdkVersion = 26'
  {
    echo
    echo "// verify/matrix/app.sh: as in the committed example"
    echo "android { defaultConfig { $(grep "buildConfigField.*OTEL_TEST_MODE" "$old/android/app/build.gradle" | sed 's/^ *//') } }"
    sed -n '/^tasks.matching { it.name.startsWith("createBundle") }/,/^}/p' "$old/android/app/build.gradle"
  } >> android/app/build.gradle
  grep -qF 'inputs.files' android/app/build.gradle || die "bundle inputs not found in the committed app/build.gradle"

  local delegate=ios/OpenTelemetryExample/AppDelegate.swift
  edit "$delegate" 's/\A/import ReactNativeOpenTelemetryCore\n/; s/(didFinishLaunchingWithOptions.*?-> Bool \{\n)/$1    startOtel()\n/s' \
    '    startOtel()'
  sed -n '/^\/\/ otel-init:/,$p' "$old/$delegate" >> "$delegate"
  grep -qF 'func startOtel()' "$delegate" || die "no '// otel-init:' section in the committed AppDelegate.swift"
  cp "$old/ios/Podfile" ios/Podfile
  edit ios/OpenTelemetryExample.xcodeproj/project.pbxproj \
    's/PRODUCT_BUNDLE_IDENTIFIER = [^;]*;/PRODUCT_BUNDLE_IDENTIFIER = opentelemetry.example;/g' \
    'PRODUCT_BUNDLE_IDENTIFIER = opentelemetry.example;'
  rm -rf "$tmp"
}

pack() {
  local app=$1 tmp tgz
  tmp=$(mktemp -d)
  npm pack --pack-destination "$tmp" >/dev/null
  tgz=$(ls "$tmp"/*.tgz)
  echo "pack: $(basename "$tgz") -> $app"
  rm -f "$app/node_modules/react-native-open-telemetry"
  (cd "$app" && bun add "$tgz")
  [ ! -L "$app/node_modules/react-native-open-telemetry" ] || die "$app: still links the root"
  edit "$app/react-native.config.js" 's/^.*react-native-open-telemetry.*root:.*\n//m' 'react-native-test-native'
  if grep -qF "'react-native-open-telemetry'" "$app/react-native.config.js"; then die "$app: still links the root"; fi
  edit "$app/metro.config.js" \
    "s|require\('\.\./metro'\)|require('react-native-open-telemetry/metro')|; s/, 'react-native-open-telemetry': root//" \
    "require('react-native-open-telemetry/metro')"
  if grep -qF "'react-native-open-telemetry': root" "$app/metro.config.js"; then die "$app: metro still maps the root"; fi
  if [ "$app" = example ]; then
    local pod="pod 'ReactNativeOpenTelemetryCore', :path => '../node_modules/react-native-open-telemetry'"
    edit "$app/ios/Podfile" "s|pod 'ReactNativeOpenTelemetryCore', :path => '\.\./\.\.'|$pod|" "$pod"
  fi
}

case "${1:-}" in
  bare) [ -n "${2:-}" ] || die "usage: app.sh bare <rn-version>"; bare "$2" ;;
  pack) [ "${2:-}" = example ] || [ "${2:-}" = example-expo ] || die "usage: app.sh pack example|example-expo"; pack "$2" ;;
  *) die "usage: app.sh bare <rn-version> | pack example|example-expo" ;;
esac
