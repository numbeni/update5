---
name: Site rename endpoint
description: PATCH /api/sites/:id/rename — updates name, url, host for a site (operator+)
---

**Endpoint:** `PATCH /api/sites/:id/rename`

**Auth:** operator, admin, or founder (checked inline, not via requireRole middleware — though requireAuth is used).

**Body:** `{ name: string, url: string }`

**Behavior:** Validates URL, extracts `host = new URL(url).hostname.replace(/^www\./i, "")`, updates name/url/host in DB, logs audit event `rename_site`.

**Why:** Separate from the generic PATCH /sites/:id route to make the intent explicit and keep the permission check clear.

**Frontend:** `SiteEditDialog` component in dashboard.tsx — opens via right-click context menu "Edit Site" option. Uses `ctx.site.editSite`, `ctx.site.editSiteTitle`, `ctx.site.editName`, `ctx.site.editSuccess`, `ctx.site.editError` translation keys.
