// Run after `changeset version`: copies package.json's version into the one hand-kept distro constant
// (iOS: ios/RNOtel/RNOtel.swift). Android reads package.json at build time; JS imports it.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const {version} = require(path.join(root, 'package.json'));
for (const [file, re] of [
  ['ios/RNOtel/RNOtel.swift', /(packageVersion = ")[^"]*(")/],
]) {
  const p = path.join(root, file);
  const src = fs.readFileSync(p, 'utf8');
  if (!re.test(src)) throw new Error(`sync-distro-version: no version constant in ${file}`);
  fs.writeFileSync(p, src.replace(re, `$1${version}$2`));
}
