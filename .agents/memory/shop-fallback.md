---
name: Shop fallback check
description: /shop path is tried after home-page failures in Phase 2 and Phase 3 to avoid false positives
---

**Where it lives:** `shopFallbackOk(site)` helper in `artifacts/api-server/src/monitoring/engine.ts`; also `buildShopFallbackUrl()` next to it.

**Logic:** Constructs `new URL(site.url).origin + "/shop"` and calls `checkHttp`. Returns `true` if status is `ok` or `slow`.

**When it runs:**
1. Phase 2 (server second pass): if a site is confirmed down after both passes → try /shop → if OK, do NOT push to `confirmedDownInServer`.
2. Phase 3 (final recheck): after all 5 attempts fail → try /shop → if OK, do NOT push to `stillDownIds`.

**Why:** Some sites (e-commerce, shared hosting) have a slow/broken home page but operational sub-pages. The /shop path is a stable proxy for "is the server actually responding".

**How to apply:** Only applies when the main URL returns "down" in the sweep. Never overrides "slow" or "degraded" — those are not false positives.
