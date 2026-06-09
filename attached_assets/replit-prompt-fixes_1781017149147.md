# Replit Prompt — Bug Fixes (3 issues)

---

## Bug 1 — Context Menu Enable/Disable State Resets After Navigation

**Problem:**
In `artifacts/noc-monitor/src/pages/dashboard.tsx`, the `SiteContextMenu` component uses local optimistic state for `localProductCheck` and `localAlsoShop`:

```ts
const [localProductCheck, setLocalProductCheck] = useState(site.productCheckEnabled);
useEffect(() => { setLocalProductCheck(site.productCheckEnabled); }, [site.productCheckEnabled]);
```

When the user enables/disables Product Check from the context menu, the optimistic state updates correctly in that moment. However, when the user navigates away and returns to the dashboard, the **React Query cache** for `listSites` still holds the **stale (old) value** because `staleTime: 20000` (20 seconds) — so the `site` prop passed to `SiteContextMenu` still has the old `productCheckEnabled` value, making the `useEffect` reset `localProductCheck` back to the old value. This makes the menu always show "Enable" instead of reflecting the real current state.

**Fix:**
After a successful toggle in `handleToggleProductCheck` (and `handleAlsoShop`), in addition to calling `onRefetch()`, also **force-invalidate the React Query cache** so the next render gets fresh data from the server. The `onRefetch` callback at the top of the dashboard does `queryClient.invalidateQueries(getListSitesQueryKey())`, which is correct, but the problem is `staleTime: 20000` prevents an immediate refetch if the query was recently fetched.

Do **one of the following** (choose the cleaner approach):

**Option A:** In the `SiteContextMenu` component, after calling `onRefetch()` in both `handleToggleProductCheck` and `handleAlsoShop`, also call the fetch API directly to `GET /api/sites` or wait for server confirmation, then update the local state only from the server response.

**Option B (recommended):** In `artifacts/noc-monitor/src/pages/dashboard.tsx`, find where `onRefetch` is defined (around line 2561) and ensure it calls `queryClient.invalidateQueries` AND also does a `queryClient.resetQueries` or sets `staleTime` to 0 at that moment so the cache is considered stale immediately. Specifically:

```ts
// In the Dashboard component where onRefetch is defined:
const onRefetch = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: getListSitesQueryKey() });
  queryClient.invalidateQueries({ queryKey: ["servers"] });
  // Force immediate refetch by resetting stale time:
  queryClient.refetchQueries({ queryKey: getListSitesQueryKey() });
}, [queryClient]);
```

**Also** make sure the `useListSites` query has `staleTime: 0` OR that the `onRefetch` passed to `SiteContextMenu` always triggers a fresh server fetch. The `staleTime: 20000` is fine for background polling but should not block an explicit user-triggered refetch.

---

## Bug 2 — "Sweep — Per-site Down" Browser Notification Not Working

**Problem:**
In `artifacts/noc-monitor/src/pages/settings.tsx`, the toggle `alertSweepDownSites` is inside the **Alerts (`section-alerts`)** card — this is the Nextcloud Talk alerts section. This toggle controls whether `sweep_down_site` SSE events are broadcast to the browser via the notification context.

The `sweep_down_site` browser notification flow is:
1. Backend engine (`artifacts/api-server/src/monitoring/engine.ts`) checks `settings.alertSweepDownSites` and broadcasts `sweep_down_site` SSE events at end of sweep
2. Frontend `notifications.tsx` context listens on SSE and calls `fireSweepNotif()` for `sweep_down_site` events
3. `fireSweepNotif()` checks `prefs.types.includes("sweep_down_site")` — this is the **browser notification prefs** stored in `localStorage`

**The bug:** `alertSweepDownSites` is a **backend/server-side setting** that gates the SSE broadcast. But `prefs.types` is the **frontend browser notification setting**. The user must enable BOTH:
- `alertSweepDownSites = true` (server setting in Alerts section)
- `sweep_down_site` in browser notification types (frontend setting in Browser Notifications section)

Currently the Alerts section toggle (`alertSweepDownSites`) is labeled as a "Per-site sweep down browser notification" which is confusing and its placement in the Alerts/Nextcloud section misleads users.

**Fix:**

**Step 1 — Move the toggle to the correct section:**
Remove the `{/* Per-site sweep down browser notification */}` block from `section-alerts` (inside the Alerts/Nextcloud card) and move it to the `BrowserNotificationsSection` component (around line 1018), placing it as an additional toggle after the existing event-type checkboxes.

**Step 2 — Fix the label/description:**
Update translations (`artifacts/noc-monitor/src/i18n/translations.ts`) for `settings.alert.sweepDownSites` and `settings.alert.sweepDownSitesDesc` to clearly indicate this controls **backend SSE broadcast** of down-site events at sweep end. Rename the key to something unambiguous like `settings.browser.sweepDownSitesBackend`. The description should say: "At the end of each sweep, the server will send a browser notification for each site currently in the Critical/Down section."

**Step 3 — Verify the backend logic is correct:**
In `artifacts/api-server/src/monitoring/engine.ts`, confirm this block runs correctly and is not guarded by anything else:

```ts
if (endSweepSettings.alertSweepDownSites) {
  // queries down/blocked sites and broadcasts sweep_down_site SSE
}
```

If `alertSweepDownSites` defaults to `false` in settings (which it does — `alertSweepDownSites: false` in defaults), make sure the UI makes it clear the user needs to explicitly turn this on.

**Step 4 — Make sure browser notification prefs include `sweep_down_site` by default:**
In `artifacts/noc-monitor/src/contexts/notifications.tsx`, `DEFAULT_TYPES` currently only includes `incident_new` and `incident_resolved`. Add `sweep_down_site` to defaults or at minimum make sure the checkbox in `BrowserNotificationsSection` for `sweep_down_site` is visible and clearly labeled.

---

## Bug 3 — Add "Per-site Down at Sweep End" Notification to Nextcloud Talk

**Problem:**
The Nextcloud Talk integration currently sends alerts for individual site status events (down, recovered, SSL, DNS, etc.) but has **no equivalent of the "sweep_down_site" feature** — i.e., at the end of each sweep, send one Nextcloud Talk message per site that is currently in the Critical/Down bar.

Also, the **Alerts (`section-alerts`) card currently has a misplaced toggle** labeled "Per-site sweep-end browser notification" which belongs in the Browser Notifications section (see Bug 2). The Alerts/Nextcloud section should instead have its own equivalent toggle for Nextcloud Talk.

**Fix:**

### Backend — `artifacts/api-server/src/services/settings.ts`

Add a new boolean setting:
```ts
ncAlertSweepDownSites: boolean;  // defaults to false
```

Add it to `KNOWN_KEYS`, defaults (`ncAlertSweepDownSites: false`), the `fromMap` parser (`parseBool`), and the `patch` function.

### Backend — `artifacts/api-server/src/monitoring/engine.ts`

In the same section where `alertSweepDownSites` is checked (end of sweep), add a parallel block for Nextcloud Talk:

```ts
if (!wasCancelled) {
  const endSweepSettings = getCachedSettings();

  // Browser SSE notifications (existing)
  if (endSweepSettings.alertSweepDownSites) {
    // ... existing SSE broadcast code ...
  }

  // Nextcloud Talk per-site sweep-end notifications (new)
  if (endSweepSettings.ncAlertSweepDownSites && isNextcloudTalkConfigured()) {
    try {
      const downSites = await db
        .select({ id: sitesTable.id, name: sitesTable.name, url: sitesTable.url, host: sitesTable.host })
        .from(sitesTable)
        .where(
          and(
            inArray(sitesTable.overallStatus, ["down", "blocked"]),
            eq(sitesTable.monitoringPaused, false),
            eq(sitesTable.currentlyFine, false),
          ),
        );
      for (const ds of downSites) {
        // Use a short cooldown (e.g. monitorIntervalMs / 60000 minutes) to avoid
        // spamming if sweeps run very frequently. Use 0 to disable cooldown here
        // since the sweep itself is already rate-limited by the sweep interval.
        await sendImportantAlert({
          siteId: ds.id,
          alertType: "site_down",
          severity: "critical",
          rootCause: "sweep_end_down",
          cooldownMinutes: 0,  // No extra cooldown — sweep interval is the rate limiter
          message: {
            english: `🔴 Site still DOWN at sweep end\n🌐 Site: ${ds.name}\n🔗 URL: ${ds.url}`,
            persian: `🔴 سایت همچنان از دسترس خارج است\n🌐 سایت: ${ds.name}\n🔗 آدرس: ${ds.url}`,
          },
        });
      }
    } catch (err) {
      logger.error({ err }, "Failed to send Nextcloud sweep-end down-site notifications");
    }
  }
}
```

> **Note:** `rootCause: "sweep_end_down"` is a new distinct root cause that differentiates these sweep-end messages from regular `site_down` alerts in the fingerprint/cooldown system. This prevents them from being suppressed by the cooldown of a regular site_down alert for the same site.

### Frontend — `artifacts/noc-monitor/src/pages/settings.tsx`

1. **Remove** the misplaced `{/* Per-site sweep down browser notification */}` block from `section-alerts` (the Alerts/Nextcloud card). That block (`alertSweepDownSites` toggle) should be moved to `BrowserNotificationsSection` as described in Bug 2.

2. **Add** a new toggle in the Alerts/Nextcloud card (`section-alerts`) for the new `ncAlertSweepDownSites` setting:

```tsx
{/* Per-site Nextcloud Talk sweep-end notification */}
<div className="flex items-start justify-between gap-4 border-t pt-6">
  <div className="space-y-1 max-w-xl">
    <Label className="text-sm font-medium">{t("settings.alert.ncSweepDownSites")}</Label>
    <p className="text-xs text-muted-foreground">{t("settings.alert.ncSweepDownSitesDesc")}</p>
  </div>
  <Switch
    checked={!!((appSettings as any).ncAlertSweepDownSites)}
    disabled={updateAppSettings.isPending}
    onCheckedChange={(v) => persistSettings({ ncAlertSweepDownSites: v } as any)}
  />
</div>
```

### Frontend — `artifacts/noc-monitor/src/i18n/translations.ts`

Add translation keys for:
- `settings.alert.ncSweepDownSites` → English: `"Per-site Down — Nextcloud Talk"`, Persian: `"اطلاع‌رسانی Nextcloud برای سایت‌های خاموش پس از هر Sweep"`
- `settings.alert.ncSweepDownSitesDesc` → English: `"At the end of each sweep, send one Nextcloud Talk message per site currently in the Critical/Down bar."`, Persian: `"در پایان هر Sweep، برای هر سایتی که در بخش Critical/Down قرار دارد یک پیام جداگانه در Nextcloud Talk ارسال می‌شود."`

### Backend — `lib/api-spec/openapi.yaml` and `lib/api-zod`

Add `ncAlertSweepDownSites: boolean` to the `AppSettings` schema and `UpdateAppSettingsBody` schema so the generated types include it.

---

## Summary of Files to Modify

| File | Change |
|---|---|
| `artifacts/api-server/src/services/settings.ts` | Add `ncAlertSweepDownSites` setting |
| `artifacts/api-server/src/monitoring/engine.ts` | Add Nextcloud per-site sweep-end notification block |
| `artifacts/noc-monitor/src/pages/dashboard.tsx` | Fix `onRefetch` to force-invalidate + refetch site cache immediately |
| `artifacts/noc-monitor/src/pages/settings.tsx` | Move browser sweep toggle to Browser section; add NC sweep toggle to Alerts section |
| `artifacts/noc-monitor/src/contexts/notifications.tsx` | Ensure `sweep_down_site` is easy to enable (consider adding to defaults or making it more visible) |
| `artifacts/noc-monitor/src/i18n/translations.ts` | Add new NC sweep-end translation keys |
| `lib/api-spec/openapi.yaml` | Add `ncAlertSweepDownSites` to AppSettings schema |
| `lib/api-zod/src/generated/types/appSettings.ts` | Add `ncAlertSweepDownSites` field |
| `lib/api-zod/src/generated/types/updateAppSettingsBody.ts` | Add `ncAlertSweepDownSites` field |
