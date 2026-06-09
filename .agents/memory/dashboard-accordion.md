---
name: Dashboard accordion state
description: openServers state type and collapse-all/expand-all logic in main dashboard
---

**State:** `const [openServers, setOpenServers] = useState<Set<number>>(new Set())`

- Empty set = all accordions collapsed (default on load)
- Server ID in the set = that server's accordion is open
- The old "all" sentinel value was removed

**Derived state (after sortedServers is computed):**
```ts
const allOpen = sortedServers.length > 0 && sortedServers.every((s) => openServers.has(s.id));
function toggleAllServers() {
  if (allOpen) setOpenServers(new Set());
  else setOpenServers(new Set(sortedServers.map((s) => s.id)));
}
```

**UI:** Expand/Collapse All button above the server accordion list in grid view. Uses `dash.expandAll` / `dash.collapseAll` i18n keys.

**Why:** UX decision — servers collapsed by default gives a cleaner overview especially for large installations with many servers.
