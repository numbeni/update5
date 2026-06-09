---
name: All-in-one import/export
description: Bulk import/export of all servers+sites in a plain-text "Server Name | CODE\nurl" format
---

**Endpoints:**
- `POST /api/sites/all-in-one-import` — parses text, finds/creates servers by code, appends sites
- `GET /api/sites/all-in-one-export` — serialises all enabled sites grouped by server

**Format:**
```
Main Server | SRV001
https://site1.com
https://site2.com

Backup Server | SRV002
https://site4.com
```

**Server matching:** code (column `code` in serversTable) is the unique key; if found → reused, if not → created with color=#22c55e.

**Duplicate sites:** checked by exact URL match; skipped silently (counted in sitesSkipped).

**Frontend:** `AllInOneDialog` component in dashboard.tsx; button labelled `dash.allInOne` in toolbar near "Add Site"; two-tab UI (Import / Export); export tab loads on tab switch.

**Why:** Operators need a human-readable backup they can paste into a new install.
