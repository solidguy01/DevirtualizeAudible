# Worklog

## 2026-10-27: MVP 1.1.0

### `closest('li')` does not find the result card
- Issue: the planned `label.closest('li')` returned the narrator line itself, not the card.
- Root cause: `.narratorLabel` is itself an `li.bc-list-item` inside a small metadata `<ul>` within the card. Its parent is a UL, so the "parent is UL" check passes and only the narrator line would be removed.
- Fix: use `label.closest('li.productListItem')` (card id `product-list-item-<ASIN>`, parent UL with 20 children). The 9-level `parentElement` walk is kept as fallback; it lands on the same element.

### Choosing the advanced search exclusion term
- Issue: unclear whether `-virtual_voice` (keywords) or `narrator=-virtual` reduces AI titles.
- Test: same-origin fetches of `/search` variants, counting cards whose narrator matches the patterns.

| Query | AI cards | Total results |
|---|---|---|
| `keywords=werewolf`, pages 1-3 | 45 / 60 | over 4,000 |
| `keywords=werewolf -virtual_voice`, pages 1-3 | 0 / 59 | over 900 |
| `keywords=werewolf&narrator=-virtual`, pages 1-3 | 0 / 57 | over 900 |
| `keywords=voice replica`, page 1 | 19 / 20 | over 2,000 |
| `keywords=voice replica -virtual_voice`, page 1 | 0 / 1 | 1 |
| `keywords=voice replica&narrator=-virtual`, page 1 | 19 / 20 | over 2,000 |
| `keywords=litrpg -"virtual voice"`, page 1 | 20 / 20 | over 1,000 |
| `keywords=-virtual_voice` (no other terms), page 1 | 0 / 20 | over 60,000 |
| `narrator=AI Voice`, page 1 | 20 / 20 | over 3,000 |
| `narrator=AI Voice&keywords=-virtual_voice` | 0 / 0 | 0 |
| `narrator=Synthesized Voice`, page 1 | 19 / 20 | 87 |
| `narrator=Synthesized Voice&keywords=-virtual_voice` | 0 / 0 | 0 |

- `-virtual_voice` takes the AI Voice and Synthesized Voice narrator searches from thousands / 87 results to zero, so it excludes those types too. Voice replica evidence is one query. "AI Narrator" was not tested on its own (it appeared only inside Synthesized Voice labels).
- Result: chose `-virtual_voice`. `narrator=-virtual` misses voice replicas; the quoted phrase returns only AI titles.
- Note: relevance and newest sorts for litrpg/romance showed almost no AI titles on pages 1-2; "werewolf" (relevance) was needed to get a measurable sample.

### Observer feedback loop risk
- Issue: writing the summary text from inside the MutationObserver callback triggers another mutation.
- Fix: only write the summary text when it changes; kept cards are marked `data-devirtualizer="kept"` so reruns skip them. Verified 0 mutations while idle after filtering.

### PRIVACY statement vs checkbox preference
- Issue: PRIVACY said "No data is stored", but the advanced search checkbox state is saved in audible.com's localStorage.
- Fix: PRIVACY now states the single stored value and that nothing is transmitted and no permissions are used.

## 2026-10-27: Review round 1 (branch refactor/review-cleanup)

### README build commands broken on macOS
- Issue: `cp -R src/firefox/ dist` produced `dist/manifest.json` instead of `dist/firefox/`, so the next `cp` failed.
- Root cause: BSD `cp` (macOS `/bin/cp`) copies the contents of a source ending in `/`; GNU `cp` copies the folder. The earlier check that "the README commands work" ran GNU `cp` from PATH, so it missed this.
- Fix: `cp -R src/firefox dist/` (works with both). `bsdtar -C dist/firefox` uses a relative path instead of `` `pwd` ``.

### Fallback walk could act outside result lists
- Issue: with the path whitelist gone, the 9-level fallback runs wherever a `.narratorLabel` is not inside `li.productListItem`.
- Check: fetched product (`/pd/`, AI and human titles), series, home, category landing and bestsellers pages. Product, home and category landing pages have no `.narratorLabel` at all; on bestsellers and series pages every label is inside a result card. Series pages are therefore filtered too.
- Decision: the fallback is kept because the handoff asked for it. It only runs if Audible renames `productListItem`, and then it can still pick a non-result `LI` inside a `UL`. Dropping it (fail safe: remove nothing) is the alternative.
- Fix: the fallback result is only used if it is an `LI` whose parent is a `UL`.

### Cards marked before their label had text
- Issue: a card was marked `kept` on first sight even if its label had no "Narrated by:" text yet, so a late-rendered AI label would never be checked again.
- Fix: cards are only marked once the label has "Narrated by:" followed by a non-empty name (`/^Narrated by:\s*(\S.*)/i`). Round 2 caught that the first version still marked "Narrated by: " with the name missing.

### docs/tmp files not committed
- Issue: `docs/tmp/worklog.md` and the tracking doc were linked from tracked docs but missing from git, including on the PR #1 branch.
- Root cause: the global gitignore (`~/.gitignore_global`) ignores `tmp/`, so `git add docs/` skipped them silently.
- Fix: added with `git add -f`.

### Debounce could starve on busy pages
- Issue: the trailing debounce reset on every mutation, so a page that never stops mutating would never be filtered.
- Fix: throttle instead: at most one run per 200 ms while mutations continue.

### Reviewed and not changed
- Re-querying `#ad-search-key` on submit and guarding against duplicate submit listeners: only relevant if Audible re-renders the form; `/advsr` is static server HTML.
- Submit listener phase: verified live (script injected into the page, real Submit button click) that the term is sent.
- Empty keywords with the checkbox on: `keywords=-virtual_voice` alone returns full results (table above).
- Start-anchored patterns miss mixed narrator lists such as "Jane Doe, AI Voice ..."; same as 1.0.4, kept.
- Placeholder Chrome popup: kept for the planned popup toggle.
