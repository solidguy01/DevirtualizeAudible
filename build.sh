#!/bin/sh
# Builds dist/<browser>/ (load unpacked) and dist/<browser>.zip for chrome and firefox.
# The manifest version is injected from $VERSION (CI release); local and PR builds get 0.0.0.
set -eu
cd "$(dirname "$0")"

version=${VERSION:-0.0.0}
if ! echo "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "VERSION must be MAJOR.MINOR.PATCH, got '$version'" >&2
  exit 1
fi

rm -rf dist
for browser in chrome firefox; do
  mkdir -p "dist/$browser"
  cp -R "src/$browser/." src/common/. "dist/$browser/"
  cp LICENSE PRIVACY "dist/$browser/"
  sed -i.bak "s/\"version\": *\"[^\"]*\"/\"version\": \"$version\"/" "dist/$browser/manifest.json"
  rm "dist/$browser/manifest.json.bak"
  (cd "dist/$browser" && zip -qrX "../$browser.zip" .)
done
