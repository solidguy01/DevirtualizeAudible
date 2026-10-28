#!/bin/sh
# Builds dist/<browser>/ (load unpacked) and dist/<browser>.zip for chrome and firefox
set -eu
cd "$(dirname "$0")"
rm -rf dist
for browser in chrome firefox; do
  mkdir -p "dist/$browser"
  cp -R "src/$browser/." src/common/. "dist/$browser/"
  cp LICENSE PRIVACY "dist/$browser/"
  (cd "dist/$browser" && zip -qrX "../$browser.zip" .)
done
