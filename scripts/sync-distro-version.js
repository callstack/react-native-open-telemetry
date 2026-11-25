// Run after `changeset version`: copies package.json's version into the two hand-kept distro constants
// (web: src/sdk/config.ts, iOS: ios/RNOtel/RNOtel.swift). Android reads package.json at build time.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const {version} = require(path.join(root, 'package.json'));
for (const [file, re] of [
  ['src/sdk/config.ts', /(DISTRO_VERSION = ')[^']*(')/],
  ['ios/RNOtel/RNOtel.swift', /(packageVersion = ")[^"]*(")/],
]) {
  const p = path.join(root, file);
  const src = fs.readFileSync(p, 'utf8');
  if (!re.test(src)) throw new Error(`sync-distro-version: no version constant in ${file}`);
  fs.writeFileSync(p, src.replace(re, `$1${version}$2`));
}
