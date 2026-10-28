#!/bin/sh
# Prints the next release version from the Conventional Commits since the last vX.Y.Z tag:
# breaking change -> major, feat -> minor, fix/perf -> patch. Prints nothing when no release is due.
set -eu
cd "$(dirname "$0")"

last=$(git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' 2>/dev/null || echo v0.0.0)
range="$last..HEAD"
[ "$last" = v0.0.0 ] && range=HEAD
subjects=$(git log --format=%s "$range")
bodies=$(git log --format=%b "$range")

IFS=. read -r major minor patch <<EOF
${last#v}
EOF

if printf '%s\n' "$subjects" | grep -Eq '^[a-z]+(\([^)]*\))?!:' \
  || printf '%s\n' "$bodies" | grep -Eq '^BREAKING[ -]CHANGE:'; then
  echo "$((major + 1)).0.0"
elif printf '%s\n' "$subjects" | grep -Eq '^feat(\([^)]*\))?:'; then
  echo "$major.$((minor + 1)).0"
elif printf '%s\n' "$subjects" | grep -Eq '^(fix|perf)(\([^)]*\))?:'; then
  echo "$major.$minor.$((patch + 1))"
fi
