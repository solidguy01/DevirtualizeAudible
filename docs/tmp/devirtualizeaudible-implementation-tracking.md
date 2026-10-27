# DevirtualizeAudible implementation tracking

## Project overview
- Goal: improve the fork of montsamu/DevirtualizeAudible for unpacked personal use.
- Constraints: zero extension permissions, no network calls, no user data read or sent, PRIVACY must stay true.
- Expected outcome: MVP 1.1.0 (robust card removal, unified patterns, in-place update handling, all result pages, advanced search checkbox), then pause for user testing.

## Timeline of approaches and issues

### 2026-10-27: Card detection via `closest('li')`
- Approach: replace the 9-level parent walk with `label.closest('li')`.
- Issue: `.narratorLabel` is an `li` itself, so this returned the label.
- Root cause and test details: `docs/tmp/worklog.md`.
- Status: ABANDONED, replaced by `closest('li.productListItem')` with the walk as fallback (FIXED).
- Files modified: `src/common/js/devirtualizeAudible.js`.
- Lesson: check the element's own tag before using `closest()` with a bare tag selector.

### 2026-10-27: Advanced search exclusion term
- Approach: compare `-virtual_voice` (keywords), `narrator=-virtual` and `-"virtual voice"` on live searches.
- Result: `-virtual_voice` excludes all synthetic narration types tested; `narrator=-virtual` misses voice replicas; the quoted phrase backfires. Data: `docs/tmp/worklog.md`.
- Status: FIXED, `-virtual_voice` used.
- Files modified: `src/common/js/devirtualizeAudible.js`, `PRIVACY`.

### 2026-10-27: Path whitelist removal
- Approach: run everywhere and act only where `.narratorLabel` sits in a result card.
- Result: adds `/charts/best` and `/series/...`; `/cat/...` landing pages, home and product pages have no cards.
- Status: FIXED.
- Files modified: `src/common/js/devirtualizeAudible.js`, `docs/01-page-coverage.md`.

### 2026-10-27: Review round 1 (branch refactor/review-cleanup)
- Approach: two independent review agents (correctness; simplification and docs consistency), findings verified before applying.
- Fixed: macOS build commands, fallback walk guard, late-rendered labels, observer throttle, small code tidy-ups, Chrome manifest icon, PRIVACY wording, stale and contradictory docs.
- Root causes and items reviewed but not changed: `docs/tmp/worklog.md`.
- Status: FIXED.
- Files modified: `src/common/js/devirtualizeAudible.js`, both manifests, `PRIVACY`, `README.md`, `CLAUDE.md`, docs.

### 2026-10-27: Review round 2
- Approach: fresh review agent on the round 1 commit for regressions and doc accuracy.
- Fixed: empty narrator name was still marked `kept`; docs/tmp files were never committed (global `tmp/` ignore); exclusion-term claim narrowed to what was tested; contradictory verification checkboxes.
- Kept: fallback walk (handoff requirement), see worklog.
- Status: FIXED.

## Solutions implemented
- `src/common/js/devirtualizeAudible.js`: strict mode, IIFE, no implicit globals; single `AI_NARRATOR_PATTERNS` array (case-insensitive); `findCard()` with guarded fallback; idempotent `filterResults()` with `data-devirtualizer` marks and running count; single `#devirtualizer-summary` element; throttled body `MutationObserver`; `/advsr` checkbox with localStorage preference.
- Version 1.1.0 in both manifests, zips rebuilt in `downloads/`.

## Current status
- [x] MVP 1: robust card removal, strict mode
- [x] MVP 2: pattern array
- [x] MVP 3: MutationObserver, idempotent filtering, single summary
- [x] MVP 4: path coverage, documented in `docs/01-page-coverage.md`
- [x] MVP 5: advanced search checkbox
- [x] MVP 6: version bump, zips, README
- [x] Installed unpacked build verified on live search (filtering and summary), `/advsr` (checkbox shown and checked) and bypass
- [ ] Remaining manual tests (below)
- [ ] Enhancements, after feedback: other Audible domains with localized labels, popup toggle (needs storage permission, discuss first), Firefox MV3, jsdom snapshot test

Manual test checklist:
- [x] `/search?keywords=werewolf`: AI titles removed, count correct, one summary line
- [x] Change sort order: full page reload, results filtered on load (verified with installed build)
- [ ] Apply a filter: new results filtered
- [ ] `/advsr`: submit adds `-virtual_voice` once (verified by injection, not yet with the installed build)
- [ ] `/advsr`: unchecked state persists after reload (verified by injection, not yet with the installed build)
- [x] `&devirtualize=no` shows everything
- [x] Pages without matches: no summary line
- [ ] Firefox temporary add-on

## Files modified tracking
- `src/common/js/devirtualizeAudible.js`: full rewrite (38 to ~150 lines)
- `src/chrome/manifest.json`, `src/firefox/manifest.json`: version 1.0.4 to 1.1.0, description; Chrome gains top-level `icons`
- `PRIVACY`: states the one stored value and the added search term
- `README.md`: tagline, features, install unpacked, version history, build commands, download links
- `downloads/DevirtualizeAudible-{chrome,ff}-1.1.0.zip`: new
- `docs/01-page-coverage.md`, `docs/tmp/worklog.md`, this file: new
- `CLAUDE.md`: new

## Lessons learned
- Audible page DOM uses nested `bc-list` ULs; select the card by class, not by tag.
- Paging on `/search` is a full reload today; the observer is a safeguard.
- AI titles are rare on page 1 of many genre searches; use a query like "werewolf" (relevance sort) to test.
- Test shell commands with the system tools users will run (`/bin/cp` on macOS), not whatever is first on PATH.

## Related documentation
- `docs/01-page-coverage.md`
- `docs/tmp/worklog.md`
