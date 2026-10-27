# Page coverage

The content script runs on every `*.audible.com` page but only changes pages that contain `.narratorLabel` elements inside result cards (`li.productListItem` in a `<ul>`). Pages without such cards are left untouched.

## Results (checked 2026-10-27, audible.com, logged in, en-US)

| Page | Result cards | Filtered | Notes |
|---|---|---|---|
| `/search?keywords=...` | 20 per page | Yes | Main use case |
| `/search?node=<category id>` | 20 per page | Yes | Category "see all" listings |
| `/newreleases` | 20 per page | Yes | |
| `/charts/best` (and `/adblbestsellers`, which redirects there) | 20 per page | Yes | Was not covered by the old `/search` + `/newreleases` whitelist |
| `/series/<name>/<id>` | One per series title | Yes | |
| `/cat/<name>/<id>` (category landing) | None | No | Carousels only, no `.narratorLabel` cards |
| `/` (home), `/ep/...` (editorial) | None | No | Carousels only |
| `/pd/<title>/<ASIN>` (product page) | None | No | No `.narratorLabel` elements |
| `/advsr` (advanced search) | None | n/a | Gets the "Exclude AI-narrated titles" checkbox instead |

Some cards have no narrator line (for example pre-orders and some podcasts); they are never removed. No checked page has a `.narratorLabel` outside a result card.

## Paging and in-place updates

Clicking "next page" on `/search` does a full page load. The script also watches the page with a `MutationObserver`, so results inserted without a reload are filtered too and the summary count is updated in place.

## Advanced search exclusion term

The checkbox on `/advsr` adds `-virtual_voice` to the keywords. In testing this term excluded the synthetic narration types tested (Virtual Voice, voice replica, AI Voice, Synthesized Voice), while the alternatives `narrator=-virtual` and `-"virtual voice"` did not. "AI Narrator" was not tested on its own. Test details are in `docs/tmp/worklog.md`.
