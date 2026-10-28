#!/bin/sh
# Builds dist/<browser>/ (load unpacked) and dist/<browser>.zip for chrome and firefox
set -eu
cd "$(dirname "$0")"

# Both manifests must carry the same MAJOR.MINOR.PATCH version
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' src/chrome/manifest.json)
if [ "$version" != "$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' src/firefox/manifest.json)" ] \
  || ! echo "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Manifest versions must match and be MAJOR.MINOR.PATCH" >&2
  exit 1
fi

rm -rf dist
for browser in chrome firefox; do
  mkdir -p "dist/$browser"
  cp -R "src/$browser/." src/common/. "dist/$browser/"
  cp LICENSE PRIVACY "dist/$browser/"
  (cd "dist/$browser" && zip -qrX "../$browser.zip" .)
done
echo "$version"
