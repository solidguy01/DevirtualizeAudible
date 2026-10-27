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
- Runs on every `*.audible.com` page; acts only where `.narratorLabel` sits inside a result card. Whole script is skipped when the URL has `?devirtualize=no`.
- Narrator text after "Narrated by:" is tested against `AI_NARRATOR_PATTERNS` (add new patterns there).
- Card = `label.closest('li.productListItem')`, falling back to a 9-level `parentElement` walk; removed only if the card's parent is a `UL`. Note `.narratorLabel` is itself an `li` in a nested metadata `ul`, so a bare `closest('li')` is wrong.
- Idempotent: kept cards get `data-devirtualizer="kept"`, removals add to a running count shown in one `#devirtualizer-summary` element under `.resultsSummarySubheading`. A debounced `MutationObserver` on `document.body` re-runs everything; the summary is written only when its text changes to avoid an observer loop.
- `/advsr`: injects an "Exclude AI-narrated titles" checkbox under `#ad-search-key`; on submit it appends `-virtual_voice` to the keywords (once). State is in the page's `localStorage` (`devirtualizer.excludeAiNarrated`).
- Hard constraint: no extension permissions, no network calls; `PRIVACY` (shipped in the zips) must stay accurate.
- Tied to Audible's DOM and class names. Page coverage and the exclusion-term test results are in `docs/01-page-coverage.md`; issue history in `docs/tmp/worklog.md`.

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
