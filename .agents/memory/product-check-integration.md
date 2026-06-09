---
name: Product check monitoring integration
description: How automatic product check is wired into the monitoring engine, and which files were touched.
---

## Rule
`runProductCheck` is called inside `runAndStoreCheck` (engine.ts) **after** the shop override and **before** the DB insert, so every downstream path (incident streaks, alert engine, SSE) sees the correct effective status.

## Trigger condition
Only runs when `site.productCheckEnabled === true` AND the main check result is `up | slow | degraded`. Skipped for `down` results to avoid wasted requests during Phase 2/3 rechecks (a DOWN site will trivially fail the product check).

## Status impact
- `status === "failed"` + homepage was `up | slow` → mutates `result.overallStatus = "degraded"`, `result.errorType = "product_page_issue"`.
- `status === "warning" | "unknown" | "error"` → no status mutation; result logged and persisted only.

## Console events
Uses new `"product"` event type (pink badge in console). Events: `starting`, `fetching_homepage`, `discovering links via homepage|sitemap`, `probing N urls`, final `status (W/C ok) — Xms`.

## Files that define ConsoleEventType "product" (must stay in sync)
1. `artifacts/api-server/src/monitoring/console-events.ts` — backend source of truth
2. `lib/api-zod/src/generated/types/consoleEventType.ts` — generated, manually patched
3. `lib/api-client-react/src/generated/api.schemas.ts` — generated, manually patched

**Why:** These generated files are not re-generated automatically; they must be patched by hand when adding new event types.

## Dashboard context menu
`handleToggleProductCheck(enabled)` sends `PATCH /api/sites/:id` with `{ productCheckEnabled: enabled }` — same pattern as `handleAlsoShop`. Icon: `Package` (pink). i18n keys: `ctx.site.enableProductCheck`, `ctx.site.disableProductCheck`, `dash.productCheckEnableSuccess`, etc.

## incidents.ts additions
- `TYPE_FROM_ERROR["product_page_issue"] = "product_page_issue"`
- `buildTitle` labels: `product_page_issue: "Product pages unreachable"`

## onProgress callback in product-check.ts
`runProductCheck(url, onProgress?)` accepts optional callback with steps: `fetching_homepage`, `discovering { source }`, `probing { count }`. Used only by engine; manual runs (site-detail route) pass no callback.
