#!/usr/bin/env bash
# Nightly helper (Task 31, .github/workflows/scheduled.yml). Run from the repo root, on a throwaway checkout: it
# rewrites example/ and example-expo/ in place, so the e2e config and every path in VERIFY.md stay the same.
#
#   verify/nightly/app.sh bare <rn>   regenerate example/android and example/ios from the React Native template at
#                                     <rn> (an npm version or range: 0.79, latest), then re-apply the example's native
#                                     edits (X13). The JS side (App.tsx, src/, metro, babel) is kept as committed.
#   verify/nightly/app.sh pack <app>  `npm pack` the package and install the tarball into <app> (example or
#                                     example-expo) instead of linking the source tree. One app per run: the Expo app
#                                     bundles example/src too, and a second copy of the SDK in example/node_modules
#                                     would be picked up there. Run `bare latest` first for a fresh bare app; the Expo
#                                     app is fresh anyway (`expo prebuild --clean`).
#
# The example's native edits, re-applied by `bare` (keep this list in sync when the example gains one):
#   Android: OtelInit.kt + `startOtel()` in MainApplication.onCreate; network_security_config (cleartext to the host);
#            minSdk 26 (C13); BuildConfig.OTEL_TEST_MODE and the bundle task inputs (app/build.gradle).
#   iOS:     `startOtel()` + everything below `// otel-init:` in AppDelegate.swift; the committed Podfile (Core pod
#            line, R24; OTEL_TEST_MODE compilation condition); bundle id opentelemetry.example.
set -euo pipefail

die() { echo "app.sh: $*" >&2; exit 1; }
# edit <file> <perl expression> <text the result must contain>: fail loudly when a template change breaks an edit
edit() { perl -0pi -e "$2" "$1"; grep -qF -- "$3" "$1" || die "could not edit $1 (template changed?)"; }

bare() {
  local rn tmp old
  rn=$(npm view "react-native@$1" version --json | jq -r 'if type == "array" then .[-1] else . end')
  [ -n "$rn" ] && [ "$rn" != null ] || die "no react-native version matches '$1'"
  echo "example: React Native $rn"
  tmp=$(mktemp -d)
  old=$tmp/old
  npx --yes @react-native-community/cli@latest init OpenTelemetryExample --version "$rn" --directory "$tmp/app" \
    --package-name opentelemetry.example --skip-install --install-pods false --skip-git-init
  cd example
  mkdir "$old"
  mv android ios "$old/"
  cp -R "$tmp/app/android" "$tmp/app/ios" .

  # package.json: the template's React Native, React and tooling; keep the example's own dependencies
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
    echo "// verify/nightly/app.sh: as in the committed example"
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
  # example-expo's postinstall links the repo root there (its plugin resolves by package name); unlink, never write
  # through the link into the checkout
  rm -f "$app/node_modules/react-native-open-telemetry"
  (cd "$app" && bun add "$tgz")
  [ ! -L "$app/node_modules/react-native-open-telemetry" ] || die "$app: still links the root"
  # autolink and bundle the installed package, not the repo root
  edit "$app/react-native.config.js" 's/^.*react-native-open-telemetry.*root:.*\n//m' 'react-native-test-native'
  if grep -qF "'react-native-open-telemetry'" "$app/react-native.config.js"; then die "$app: still links the root"; fi
  edit "$app/metro.config.js" \
    "s|require\('\.\./metro'\)|require('react-native-open-telemetry/metro')|; s/, 'react-native-open-telemetry': root//" \
    "require('react-native-open-telemetry/metro')"
  if grep -qF "'react-native-open-telemetry': root" "$app/metro.config.js"; then die "$app: metro still maps the root"; fi
  # the Core pod (R24) from the installed package, as an app using the npm package declares it. The Expo app gets it
  # from the package's own plugin at prebuild, relative to wherever the package is installed.
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
