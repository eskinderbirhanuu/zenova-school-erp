# Responsive Improvements — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2
The layout shell is already responsive (mobile drawer, responsive table→card, collapsing filters). This file lists the remaining gaps. Task IDs `[U-NN]` → `DEEPSEEK_UI_TASKS.md`.

---

## Desktop (≥1280px)

- **Max content width 1400px centered** on wide screens (currently full-bleed) — prevents eye-strain on ultrawide monitors. Add `mx-auto max-w-[1400px]` to `<main>` content wrappers.
- **Bento grids** for dashboards at `xl` (e.g. finance): 12-col grid with spans (KPIs 3-col, primary chart 8-col, side chart 4-col).
- **Multi-column forms** at `lg+`: registration form fields side-by-side (First/Middle/Last in one row), single-column on mobile.
- **Sticky table headers** within scroll containers for long lists.
- **Hover affordances** preserved (tooltips on icon-only buttons).

**Task:** [U-31]

---

## Tablet (640–1024px)

- Sidebar collapses to the **68px icon rail** automatically below `lg` is *not* current behavior (it hides entirely and uses the drawer). Consider: at `md` show the collapsed rail; only below `md` use the drawer — saves a tap for tablet users.
- KPI grid: `grid-cols-2 md:grid-cols-2 lg:grid-cols-4`.
- Charts: 2-up at `md`, 1-up below.
- DataTable: stays as table at `md` (it switches at `md` already — good).

**Task:** [U-31]

---

## Mobile (<640px)

### Layout
- `<main>` padding already `p-4 lg:p-8` — good.
- Header: hide the ⌘K search button (already `hidden sm:flex`), keep bell + avatar + hamburger. Add a compact search icon that opens the command palette instead.
- Breadcrumbs: collapse to last segment + "…" on very narrow screens (`max-w-[40vw] truncate`).

### Tables
- Card view (already implemented) — ensure **first 3 visible columns** are the right ones per entity (e.g. for invoices: Number, Amount, Status — not internal IDs). Add `mobileLabel` to every column definition.
- Add **pull-to-refresh** semantics on list pages (a refresh button in the header is enough).
- Sticky **"N selected" action bar** should sit above the OS nav (safe-area inset): `pb-[env(safe-area-inset-bottom)]`.

### Dashboards
- Show **≤3 KPIs** above the fold; rest below.
- Chart height `h-[220px]` (currently fixed `h-[280px]`).
- Hide secondary charts behind a "Show more" or tabs.
- POS: full-screen, large targets, sticky totals.

### Forms
- Single column; inputs full width; `Stepper` becomes vertical or a compact top progress bar.
- Sticky **submit bar** at the bottom (`position: sticky; bottom: 0`) with Cancel + Save so users don't scroll to find Save.
- Numeric inputs (`mode="numeric"`) for amounts/phones → correct mobile keyboards.
- `autocomplete` attributes (`given-name`, `tel`, `email`, `address-line1`) for autofill.

### Touch targets
- Audit all icon buttons → ≥44×44px (some `h-8 w-8` are 32px; bump to `h-9 w-9` minimum on touch, or add `p-1.5`).
- POS product buttons → 56–72px tiles.

### Parent / Student portals (mobile-first, cloud)
- These are the canonical mobile surfaces. Ensure:
  - Bottom **tab bar** option for top destinations (Home, Children, Pay, Messages) instead of relying only on the hamburger.
  - "Pay all" CTA reachable in the first viewport.
  - Wallet/invoice cards are tappable entirely (not just a small button).
- **Offline indicator**: a non-blocking banner when the network/SW is offline (parents on flaky data).

**Task:** [U-21], [U-22], [U-13]

---

## PWA

- `manifest.json` + service worker (`register-sw.ts`, `install-prompt.ts`) are wired — good.
- Verify:
  - `display: standalone` and a proper `themeColor` per role accent.
  - iOS apple-touch icon (present).
  - The SW caches **app shell only** (stale-while-revalidate); never cache API responses that mutate — use NetworkFirst/NetworkOnly for `/api/*`.
  - Provide an offline fallback page.
- The 3D background must **not** be cached as part of critical app shell (tie to [U-01]).

**Task:** [U-32]

---

## Accessibility on mobile

- Ensure `viewport` meta includes `viewport-fit=cover` for safe areas.
- Don't disable zoom (`user-scalable=no` is an anti-pattern); if used for app-like feel, reconsider.
- Color contrast on small text under bright sun (parent outdoors) — favor the solid tokens over gradient/glass text.

---

## Responsive test matrix (for DeepSeek/QA)

| Device | Width | Role pages to verify |
|--------|-------|----------------------|
| iPhone SE | 375 | Parent dashboard, Student dashboard, Login, POS |
| iPhone 14 | 390 | Parent payments, Notifications |
| Small Android | 360 | Student portal |
| iPad portrait | 768 | Admin dashboard, Student list |
| iPad landscape | 1024 | Finance dashboard, Data table |
| Laptop | 1366 | All |
| Wide desktop | 1920 | Super-admin mission control |

Automate with Playwright `--viewport-size` in the test suite.

**Task:** [U-33]
