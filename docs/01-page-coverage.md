# Page coverage

The content script runs on every `*.audible.com` page but only changes pages that contain `.narratorLabel` elements inside result cards (`li.productListItem` in a `<ul>`). Pages without such cards are left untouched.

## Results (checked 2026-10-27, audible.com, logged in, en-US)

| Page | Result cards | Filtered | Notes |
|---|---|---|---|
| `/search?keywords=...` | 20 per page | Yes | Main use case |
| `/search?node=<category id>` | 20 per page | Yes | Category "see all" listings |
| `/newreleases` | 20 per page | Yes | |
| `/charts/best` (and `/adblbestsellers`, which redirects there) | 20 per page | Yes | Was not covered by the old `/search` + `/newreleases` whitelist |
| `/cat/<name>/<id>` (category landing) | None | No | Carousels only, no `.narratorLabel` cards |
| `/` (home), `/ep/...` (editorial) | None | No | Carousels only |
| `/advsr` (advanced search) | None | n/a | Gets the "Exclude AI-narrated titles" checkbox instead |

Some cards have no narrator line (for example pre-orders and some podcasts); they are never removed.

## Paging and in-place updates

Clicking "next page" on `/search` does a full page load (verified: navigation type `navigate`, page state reset). The script also observes `document.body` with a debounced `MutationObserver`, so results inserted without a reload are filtered too and the summary count is updated in place.

## Server-side exclusion term

Tested on `/search` by fetching the same query with each candidate and counting AI-narrated cards:

| Query | AI cards, pages 1-3 | Total results |
|---|---|---|
| `keywords=werewolf` | 45 / 60 | over 4,000 |
| `keywords=werewolf -virtual_voice` | 0 / 59 | over 900 |
| `keywords=werewolf&narrator=-virtual` | 0 / 57 | over 900 |
| `keywords=voice replica` | 19 / 20 (page 1) | over 2,000 |
| `keywords=voice replica -virtual_voice` | 0 / 1 | 1 |
| `keywords=voice replica&narrator=-virtual` | 19 / 20 (page 1) | over 2,000 |
| `keywords=litrpg -"virtual voice"` | 20 / 20 | over 1,000 |

`-virtual_voice` in the keywords also returns zero results when combined with `narrator=AI Voice` or `narrator=Synthesized Voice`, so it excludes all synthetic narration types tested. `narrator=-virtual` misses voice replicas, and the quoted phrase `-"virtual voice"` has the opposite effect. The advanced search checkbox therefore uses `-virtual_voice`.
