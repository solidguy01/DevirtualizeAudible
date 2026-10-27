# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Browser extension (Firefox + Chrome/Edge) that removes AI/synthetic-narrated titles ("Virtual Voice", "voice replica", "AI Voice", "AI Narrator", "Synthesized Voice") from audible.com search and new-release listings. Plain JavaScript, no package manager, no build tool, no tests, no linter.

## Layout and architecture

- `src/common/` — shared between both browsers: the single content script `js/devirtualizeAudible.js` and `icons/`.
- `src/firefox/manifest.json` — Manifest V2, no popup.
- `src/chrome/manifest.json` — Manifest V3, adds an `action` popup (`html/Devirtualizer.html`, placeholder only).
- A packaged extension = browser-specific dir + `src/common/*` merged into one folder (see build commands).

Content script behavior (`src/common/js/devirtualizeAudible.js`):
- Runs on `*://*.audible.com/*` but only acts when the path is `/newreleases` or `/search`.
- Skipped when the URL has `?devirtualize=no`.
- Finds elements with class `narratorLabel`, matches text against `^Narrated by:` regexes, then walks up exactly 9 `parentElement` levels to the result card and removes it only if its parent is a `UL` (sanity check).
- Appends a struck-through "N VIRTUAL VOICE TITLE(S) REMOVED BY DEVIRTUALIZER" message to the first `.resultsSummarySubheading` `SPAN`.
- Fragile by design: tied to Audible's DOM structure and class names. If filtering stops working, Audible markup changed — check the parent depth and class names first.

To add a new narrator pattern, add another `||` regex clause in the `if` condition.

## Build

Run from repo root (`dist/` is gitignored):

```
# Firefox
mkdir -p dist
cp -R src/firefox/ dist
cp -R src/common/* dist/firefox
bsdtar -a -cvf dist/firefox.zip LICENSE PRIVACY -C `pwd`/dist/firefox/ js icons manifest.json

# Chrome/Edge
mkdir -p dist
cp -R src/chrome/ dist
cp -R src/common/* dist/chrome
bsdtar -a -cvf dist/chrome.zip LICENSE PRIVACY -C `pwd`/dist/chrome/ js icons html manifest.json
```

## Manual testing

- Firefox: `about:debugging` > This Firefox > Load Temporary Add-on > pick `dist/firefox/manifest.json`.
- Chrome/Edge: `chrome://extensions` or `edge://extensions` > Developer mode > Load unpacked > `dist/chrome`.
- Verify on an audible.com `/search` page; append `?devirtualize=no` to compare unfiltered results.

## Release

1. Bump `version` in both `src/chrome/manifest.json` and `src/firefox/manifest.json` (keep them in sync).
2. Build both zips and commit them to `downloads/` as `DevirtualizeAudible-chrome-<ver>.zip` and `DevirtualizeAudible-ff-<ver>.zip`.
3. Update README: LINKS versions, VERSION HISTORY entry, and download links in BUILD/TEST.
