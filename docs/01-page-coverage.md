# Page coverage

The content script runs on every `*.audible.com` page but only removes result cards (`li.productListItem`) whose `.narratorLabel` names an AI narrator. Checked 2026-10-27 on audible.com (en-US):

| Page | Filtered | Notes |
|---|---|---|
| `/search?keywords=...` | Yes | |
| `/search?node=<category id>` | Yes | Category "see all" listings |
| `/newreleases` | Yes | |
| `/charts/best` (`/adblbestsellers` redirects there) | Yes | |
| `/series/<name>/<id>` | Yes | |
| `/cat/<name>/<id>`, `/`, `/ep/...` | No | Carousels only, no narrator labels |
| `/pd/<title>/<ASIN>` | No | No narrator labels |
| `/advsr` | n/a | Gets the "Exclude AI-narrated titles" checkbox |

Paging and sorting on `/search` are full page loads. Cards without a narrator line (pre-orders, some podcasts) are never removed.

The `-virtual_voice` term used by the `/advsr` checkbox was tested to exclude Virtual Voice, voice replica, AI Voice, AI Narrator, Synthesized Voice and Digital Voice titles (2026-10-28). The alternatives `narrator=-virtual` (misses voice replicas) and `-"virtual voice"` (returns only AI titles) do not work.
