# NOC Monitor — User Guide

**Version:** 1.0  
**Language:** English  
**Other language:** [راهنمای فارسی](./USER_GUIDE_FA.md)

---

## Table of Contents

1. [What is NOC Monitor?](#1-what-is-noc-monitor)
2. [First-Time Setup](#2-first-time-setup)
3. [Logging In](#3-logging-in)
4. [Interface Overview](#4-interface-overview)
5. [Dashboard](#5-dashboard)
6. [Site Details](#6-site-details)
7. [Incidents](#7-incidents)
8. [SSL Management](#8-ssl-management)
9. [DNS & Resolvers](#9-dns--resolvers)
10. [Network Connectivity](#10-network-connectivity)
11. [Servers & Gateways](#11-servers--gateways)
12. [Event Logs & Console](#12-event-logs--console)
13. [User Management](#13-user-management)
14. [Audit Log](#14-audit-log)
15. [Settings](#15-settings)
16. [Keyboard Shortcuts](#16-keyboard-shortcuts)
17. [Roles & Permissions](#17-roles--permissions)
18. [Browser Notifications](#18-browser-notifications)

---

## 1. What is NOC Monitor?

NOC Monitor is a professional website monitoring system designed for hosting companies and network operations teams. It continuously checks the health of your websites and notifies you the moment something goes wrong.

**Key capabilities:**

- Real-time monitoring of HTTP status, response time, DNS resolution, TCP ports, and SSL certificates
- Automatic incident detection and alerting (Telegram, Nextcloud Talk)
- Multi-user access with role-based permissions
- Full English and Persian (RTL) support
- Runs on your own server — your data stays private

---

## 2. First-Time Setup

When you open NOC Monitor for the first time on a fresh database, the **Founder Setup Wizard** appears. This creates the first administrator account.

**Step 1 — Personal Information**
- Enter your **First Name** and **Last Name**
- Optionally set a **Display Name** (shown in the top bar)

**Step 2 — Account Details**
- Enter your **Email** address
- Choose a **Username** (lowercase letters and numbers, no spaces)

**Step 3 — Password**
- Set a strong password (minimum 8 characters)
- Confirm the password

Click **Complete Setup** — you will be logged in automatically.

> **Note:** The founder account cannot be deleted or disabled. Keep its credentials safe.

---

## 3. Logging In

On subsequent visits, the login page is shown automatically.

- Enter your **username** or **email** and **password**
- Click **Login**
- Sessions last **7 days** and persist across browser restarts

**Access Key (optional):** If your administrator has set up an access key, you can use it instead of a username/password by entering it in the access key field.

---

## 4. Interface Overview

```
┌──────────────────────────────────────────────────┐
│  Status Bar  │  NOC Monitor  │  Bell │ User Menu  │
├──────────────┴───────────────────────────────────┤
│         │                                         │
│ Sidebar │           Main Content Area             │
│  (nav)  │                                         │
│         │                                         │
└─────────┴───────────────────────────────────────-┘
```

**Status Bar (top):** Shows the monitoring engine state and internet connectivity status at a glance.

**Sidebar (left):** Navigation menu. Can be collapsed with the `S` key or the arrow button.

**Notification Bell:** Shows recent incidents. Click to see unread alerts.

**User Menu (top right):** Access your profile, change password, set presence status, or log out.

---

## 5. Dashboard

The Dashboard is the main view — it shows all monitored sites organized by server.

### 5.1 Monitoring Engine Status

At the top of the dashboard you will see the engine's current state:

| State | Meaning |
|-------|---------|
| 🟢 Running | Monitoring is active, waiting between cycles |
| 🔄 Sweeping | Currently checking sites |
| ⏸ Paused | Monitoring paused globally |
| 😴 On Rest | Scheduled quiet period |

### 5.2 Site Cards

Each site is displayed as a card showing:

- **Status indicator** (colored dot): Up / Slow / Degraded / Down / Unknown
- **Site name and URL**
- **Response time** (milliseconds)
- **HTTP status code**
- **Last check time**

**Status colors:**

| Color | Status | Meaning |
|-------|--------|---------|
| 🟢 Green | Up | Site is fully operational |
| 🟡 Yellow | Slow | Responding but above threshold |
| 🟠 Orange | Degraded | Partially failing |
| 🔴 Red | Down | Site is unreachable |
| ⚫ Gray | Unknown | Not yet checked |
| 🔵 Teal | Currently Fine | Temporarily ignored by operator |

### 5.3 Site Context Menu

Right-click (or click the `⋮` menu) on any site card to access:

- **Run Check Now** — force an immediate check of this site
- **Mark as Currently Fine** — temporarily ignore alerts for this site (set a duration)
- **Pause/Resume Monitoring** — stop or resume checks for this site
- **View Details** — go to the detailed analytics page

### 5.4 Critical Alert Banner

When one or more sites are **Down**, a red banner appears at the top. Click it to see which sites need attention.

### 5.5 Server Accordion

Sites are grouped by server. Click a server name to expand/collapse its site list. Each server shows aggregated counts (Up / Slow / Down).

---

## 6. Site Details

Click any site card or go to `/sites/:id` for in-depth information.

### 6.1 Charts & Analytics

- **Response Time History** — line chart of response times over 24 hours
- **Status History** — timeline of status changes
- **Uptime Percentage** — calculated over the last 24 hours
- **Check Count** — total checks performed

### 6.2 Diagnostics

Run on-demand checks directly from this page:

| Tool | What it does |
|------|-------------|
| **DNS Check** | Resolves the site's hostname using your configured resolvers |
| **Curl Check** | Performs an HTTP request and shows full response headers and body sample |
| **Product Check** | Application-level health check (e.g. Nextcloud availability) |

### 6.3 SSL Information

Shows the current SSL certificate status, expiry date, issuer, and days remaining.

---

## 7. Incidents

Incidents are automatically created when a site goes down or degrades. Navigate to **Incidents** in the sidebar.

### 7.1 Incident List

Each incident shows:
- **Severity:** Critical / Warning / Info
- **Status:** Open / Acknowledged / Resolved
- **Site affected**
- **Start time** and **duration**
- **Failure count**

### 7.2 Incident Lifecycle

```
Open → Acknowledged → Resolved
```

- **Open:** Newly detected problem, no operator action yet
- **Acknowledged:** An operator has seen it and is working on it
- **Resolved:** Problem is confirmed fixed (manually or automatically when site recovers)

### 7.3 Incident Detail Page

Click any incident to open its detail page:

- **Timeline** — chart of failures during the incident
- **Notes** — add comments or updates (visible to all operators)
- **Actions** — Acknowledge or Resolve buttons
- **Related checks** — individual check results during the incident period

---

## 8. SSL Management

Navigate to **SSL** in the sidebar to track certificate health across all your domains.

### 8.1 SSL Target List

Each row shows:
- **Domain** and port
- **Status:** Valid / Expiring Soon / Expired / Error
- **Days remaining**
- **Issuer** and **protocol** (TLS 1.2, TLS 1.3)
- **Expiry date**

**Status colors:**
- 🟢 Valid — more than 30 days remaining
- 🟡 Expiring Soon — 30 days or fewer remaining
- 🔴 Expired — certificate has expired
- ⚫ Error — could not check the certificate

### 8.2 Adding SSL Targets

1. Click **Add Target**
2. Enter the hostname (e.g. `example.com`) and port (default: 443)
3. Optionally link to a monitored site
4. Click **Save**

### 8.3 Auto-Link from Sites

Click **Auto-Link from Sites** to automatically scan all monitored site URLs and add them as SSL targets.

### 8.4 Bulk Import

Paste a list of domains (one per line) and click **Import** to add them all at once.

---

## 9. DNS & Resolvers

### 9.1 DNS Performance (`/dns-performance`)

Benchmarks how quickly different DNS resolvers answer queries for your monitored domains.

- **Resolver Rankings** — sorted by average latency
- **Coverage** — which resolvers successfully resolved each domain
- **Best Resolver** badge — fastest resolver for each domain

Use this to choose the best DNS resolver for your monitoring needs.

### 9.2 DNS Resolvers (`/dns-resolvers`)

Manage the list of DNS servers used during monitoring checks.

Default resolvers include Cloudflare (1.1.1.1), Google (8.8.8.8), and Quad9 (9.9.9.9).

**Adding a resolver:**
1. Click **Add Resolver**
2. Enter a name and IP address
3. Save

---

## 10. Network Connectivity

Navigate to **Connectivity** to monitor the NOC's own internet connection.

- **Status indicators** for each connectivity target (e.g. Google, Soft98, Varzesh3)
- **Live terminal log** showing real-time ping results
- **Offline banner** appears on all pages when connectivity is lost

If the NOC station loses internet, this section shows when connectivity was lost and when it was restored.

---

## 11. Servers & Gateways

### 11.1 Servers (`/servers`)

Servers are logical groupings for your monitored sites.

**Managing servers:**
- Click **Add Server** to create a new server group
- Set a name, code, color, and display order
- Assign sites to servers from the site's settings or dashboard

### 11.2 Gateways (`/gateways`)

Payment gateways and critical endpoints with dedicated health checks.

- Add gateway URLs
- View availability status and response times
- Get alerted when a gateway goes offline

---

## 12. Event Logs & Console

### 12.1 Event Logs (`/logs`)

A full audit trail of everything the monitoring engine does.

**Filtering options:**
- **Level:** Debug / Info / Warn / Error
- **Category:** System / Monitor / Incident / API / DNS
- **Search** by message text

Click **Export** to download the filtered log as a text file.

### 12.2 Console (`/console`)

Shows raw monitoring engine execution events — useful for debugging check behavior.

---

## 13. User Management

> Available to **Admin** and **Founder** roles only.

Navigate to **Users** in the sidebar.

### 13.1 User List

Shows all users with:
- Name and email
- Username
- Role badge
- Active/Inactive status
- Presence status (Online / Away / Busy / Offline)
- Last login time

### 13.2 Adding a User

1. Click **Add User**
2. Fill in: First Name, Last Name, Email, Username, Password
3. Select a **Role** (Admin / Operator / Viewer)
4. Set **Status** (Active / Inactive)
5. Click **Save**

### 13.3 Editing a User

Click the pencil icon on any user row to edit their information. Leave the password field empty to keep the current password.

### 13.4 Resetting a Password

Click the key icon (🔑) on a user row, enter a new password (minimum 8 characters), and confirm.

### 13.5 Enabling/Disabling a User

Click the **Active / Inactive** badge to toggle a user's access. Disabled users cannot log in.

> The **Founder** account cannot be disabled or deleted.

### 13.6 Deleting a User

Click the trash icon on a user row and confirm. This is permanent.

---

## 14. Audit Log

> Available to **Admin** and **Founder** roles only.

Navigate to **Audit Log** in the sidebar to see a record of all administrative actions.

Each entry shows:
- **Timestamp**
- **Actor** (who performed the action)
- **Action** (what was done: login, create_user, update_settings, etc.)
- **Resource** (what was affected)
- **Result** (success / failure)
- **IP address**

**Filtering:**
- Search by actor name or action keyword
- Filter by Action type, Resource, or Result
- Paginated with 50 entries per page

---

## 15. Settings

Navigate to **Settings** in the sidebar.

### 15.1 General

| Setting | Options |
|---------|---------|
| **Theme** | Light / Dark / System (follows OS) |
| **Language** | English / Persian (Farsi) |

### 15.2 Monitoring

| Setting | Description |
|---------|-------------|
| **Monitor Interval** | How often to check all sites (minimum 30 seconds) |
| **Alert Severity** | Minimum severity level that triggers alerts |
| **Data Retention** | How long to keep check history, event logs, and audit logs |

### 15.3 Integrations

**Nextcloud Talk**
- Set the server URL, bot username, password, and room token(s)
- Test the connection with the **Send Test** button

**Telegram** (configured via environment variables — contact your administrator)

---

## 16. Keyboard Shortcuts

Press `?` at any time to open the keyboard shortcuts help overlay.

| Key | Action |
|-----|--------|
| `?` | Show/hide shortcuts help |
| `S` | Toggle sidebar |
| `F` | Toggle fullscreen |
| `D` | Go to Dashboard |
| `I` | Go to Incidents |
| `L` | Go to Logs |
| `Esc` | Close dialog / modal |

---

## 17. Roles & Permissions

| Permission | Viewer | Operator | Admin | Founder |
|-----------|--------|----------|-------|---------|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| View incidents | ✅ | ✅ | ✅ | ✅ |
| Acknowledge/Resolve incidents | ❌ | ✅ | ✅ | ✅ |
| Run manual checks | ❌ | ✅ | ✅ | ✅ |
| Pause/resume sites | ❌ | ✅ | ✅ | ✅ |
| View logs | ✅ | ✅ | ✅ | ✅ |
| Manage sites & servers | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| View audit log | ❌ | ❌ | ✅ | ✅ |
| Change settings | ❌ | ❌ | ✅ | ✅ |
| Delete founder account | ❌ | ❌ | ❌ | ❌ |

---

## 18. Browser Notifications

NOC Monitor can send browser push notifications when incidents occur.

**Enabling notifications:**
1. Go to **Settings**
2. Scroll to **Browser Notifications**
3. Click **Enable Notifications** and grant permission in the browser popup
4. Choose which severity levels trigger notifications (Critical / Warning / Info)

**Options:**
- **Sound** — play an alert sound with each notification
- **Require Interaction** — notification stays until you dismiss it (recommended for critical alerts)

Notification preferences are stored locally in your browser and are not synced across devices.

---

*NOC Monitor — Built for hosting companies and network operations teams.*
