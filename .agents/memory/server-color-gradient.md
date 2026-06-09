---
name: Server color gradient support
description: CSS gradient strings stored in server.color; all rendering must use background not backgroundColor
---

The `server.color` field (varchar in DB) can hold either a hex color like `#22c55e` or a full CSS gradient string like `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`.

**Rule:** Every place that renders server color must use `style={{ background: server.color }}` not `style={{ backgroundColor: server.color }}`. The CSS `background` shorthand works for both solid colors and gradients; `backgroundColor` only works for solids.

**Where it applies:**
- `ServerAccordion` header button in dashboard.tsx
- `CompactView` server label badge in dashboard.tsx
- `CriticalBanner` site serverColor badge in dashboard.tsx (uses `site.serverColor`)
- Server list rows and selector in servers.tsx

**Why:** Gradients were added as preset options in the server form (GRADIENT_PRESETS constant). Solid presets remain as PRESET_COLORS. Both are stored as strings in the same `color` column.
