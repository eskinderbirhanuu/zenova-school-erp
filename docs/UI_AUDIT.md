# UI Audit — ZENOVA School ERP (Frontend)

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 (Principal Product Designer / Senior UI Engineer)
**Scope:** Next.js 16 + React 19 + Tailwind v4 + Radix UI + Recharts + Framer Motion + Three.js frontend.
**Verdict up front:** The design system is **genuinely excellent** — polished tokens, motion-aware components, strong accessibility primitives, role-accented IA, a ⌘K command palette, and a best-in-class `DataTable`. This audit is *not* a "redesign from scratch" — it is a targeted set of fixes that take the product from "great demo" to "production enterprise tool". The biggest issues are **performance** (a WebGL background on every page), **data freshness** (dashboards ship hardcoded demo data), and **tech-debt duplication** (two sidebars, two nav configs).

Format per issue:

```
### Page / Component
### Problem
### Severity: Critical | High | Medium | Low
### Recommendation
### Business Impact
```

Task IDs `[U-NN]` map to `DEEPSEEK_UI_TASKS.md`.

---

## §1 — Performance (the headline issues)

### 1.1 WebGL animated background rendered on every authenticated page
- **Page / Component:** `src/components/3d/animated-background.tsx` → imported by `finance/dashboard`, `parent/dashboard`, `student/dashboard`, `teacher/dashboard`, `super-admin/dashboard`, login, etc.
- **Problem:** A full-screen `<Canvas>` runs **7 animated 3D meshes** (`MeshDistortMaterial`, wireframe distort, `useFrame` rotation, `<Float>`), re-rendering every frame at 60fps. Three.js + drei ships **~600KB** of JS into the client bundle for purely decorative effect. It runs behind dashboards — i.e. on school PCs, low-end laptops, and parents' phones.
- **Severity:** Critical
- **Recommendation:**
  - Replace `<AnimatedBackground>` on **all authenticated dashboards** with the existing static `.glass` + CSS gradient mesh (`gradient-mesh.tsx`) — zero JS, zero GPU.
  - Gate any remaining WebGL use behind `prefers-reduced-motion`, an explicit "low-power" device check, and **only on marketing/welcome pages** (never data screens).
  - Consider `next/dynamic` lazy-loading + `@react-three/fiber`'s `frameloop="demand"` if a single hero keeps it.
  - Add a bundle budget so Three.js can't silently return.
- **Business Impact:** Jank and battery drain on the exact devices the product targets (school hardware, parent mobile); 600KB added to first load of every dashboard kills the "fast" brand promise and TTI. This is the #1 fix.
- **Task:** [U-01]

### 1.2 Dashboards render hardcoded demo data
- **Page / Component:** `finance/dashboard/page.tsx` (`revenueData`, `recentTransactions`, `actionAlerts`, `cashFlowFunnel`, `receivableAging` are literals); same pattern in admin/registrar/super-admin/teacher dashboards.
- **Problem:** The KPIs and charts show static numbers (`revenue: 82000`) regardless of the signed-in school. Users see a convincing demo that never matches reality, which destroys trust on day one and risks presenting wrong figures in screenshots.
- **Severity:** Critical
- **Recommendation:** Wire every KPI/chart to real backend aggregates (`/finance/reports/*`, `/dashboard/*`). Where the API doesn't yet return a series, show an explicit `EmptyState` ("No revenue data for this period yet") rather than fabricated numbers. Mark all mock data behind a single `MOCK_DASHBOARD_DATA` flag that's off in production.
- **Business Impact:** Misleading data is a trust/correctness blocker for any real deployment.
- **Task:** [U-02]

### 1.3 Recharts `ResponsiveContainer` instances + many `<Area>` series on each dashboard
- **Page / Component:** `finance/dashboard`, `super-admin/dashboard`, `analytics` pages.
- **Problem:** Multiple Recharts charts each mount their own ResizeObserver and render SVG paths per series; combined with the WebGL background, dashboard interactions lag on integrated GPUs.
- **Severity:** Medium
- **Recommendation:** After [U-01] removes the 3D bg, audit chart count per dashboard (≤3 primary charts). Memoize chart data; avoid re-creating `revenueData` arrays on every render (lift to module scope or `useMemo`). Use `React.lazy` for chart components.
- **Business Impact:** Smoother dashboards; lower CPU on school machines.
- **Task:** [U-03]

---

## §2 — Information Architecture & Navigation

### 2.1 Two parallel navigation systems (drift risk)
- **Page / Component:** `components/layout/sidebar.tsx` (legacy hard-coded `navItems` with `roles[]`) **and** `config/navigation.ts` (`ROLE_NAV_MAP` with sections, used by `RoleLayout`).
- **Problem:** Two sources of truth for what links appear. REVIEWS.md already flagged this (contradiction #2). Any nav change must be made twice; the legacy `Sidebar` is likely orphaned but still importable.
- **Severity:** High
- **Recommendation:** Delete `components/layout/sidebar.tsx` entirely; make `config/navigation.ts` + `RoleLayout` the single source. Grep for `<Sidebar` imports and remove.
- **Business Impact:** Prevents nav drift / wrong-role links shipping to production.
- **Task:** [U-04]

### 2.2 Breadcrumbs are path-segment based, not semantic
- **Page / Component:** `RoleLayout.Breadcrumbs` (`role-layout.tsx:105`).
- **Problem:** Breadcrumbs derive labels from URL segments (`/finance/invoices/INV-123` → "Finance › Invoices › Inv-123"). Capitalized raw slugs are ugly and unhelpful.
- **Severity:** Medium
- **Recommendation:** Add a per-page breadcrumb via a small `BreadcrumbContext` or `export const breadcrumbs` metadata in each `page.tsx`; render "Finance › Invoices › INV-2026-00001". Fall back to segment-based for unmapped pages.
- **Business Impact:** Orientation in deep entity pages (invoice/student/order detail).
- **Task:** [U-05]

### 2.3 Command palette is nav-only
- **Page / Component:** `RoleLayout.CommandPalette` (`role-layout.tsx:354`).
- **Problem:** ⌘K only searches nav items. Enterprise users expect it to also jump to "Create invoice", "Find student: John", "Go to invoice INV-…" (record-level).
- **Severity:** Medium
- **Recommendation:** Extend the palette with three sections: Pages, Quick Actions (create buttons), Recent/Records (server search debounced 200ms). Wire arrow-key + enter already in place.
- **Business Impact:** Faster expert workflows; matches Linear/Notion expectations.
- **Task:** [U-06]

### 2.4 Director sidebar duplicates all module nav
- **Page / Component:** `DIRECTOR_NAV` (`navigation.ts:114`).
- **Problem:** Director gets "Finance / Inventory / HR / Library / Cafeteria" each linking to `/director/finance` etc. — implying a full second copy of each module. This inflates the sidebar and likely leads to stub pages.
- **Severity:** Medium
- **Recommendation:** If Directors get read oversight, link to the real module routes with a `?view=oversight` and a view-only banner, not a parallel `/director/<module>` tree. Collapse to an "Oversight" section with fewer links.
- **Business Impact:** Cleaner sidebar, fewer dead/stub pages to maintain.
- **Task:** [U-07]

---

## §3 — Tables, Lists & Forms

### 3.1 No virtualization / pagination UI on the client `DataTable`
- **Page / Component:** `components/ui/data-table.tsx` + `generic-list-page.tsx`.
- **Problem:** `DataTable` renders every row in `data`. The list pages accept `totalItems` and `periods` but there's **no pagination control** surfaced — the backend paginates (skip/limit) but the UI doesn't expose page navigation. `export_students_excel` loads up to 5000 rows; a list view could easily render hundreds of motion `<tr>` (each animating).
- **Severity:** High
- **Recommendation:** Add a `<Pagination>` primitive (already missing) and wire `GenericListPage` to it; render motion only for the first screen of rows. For >100 rows, window/virtualize (e.g. `react-window`) or paginate server-side.
- **Business Impact:** List pages freeze on real school data (thousands of students/invoices).
- **Task:** [U-08]

### 3.2 Row enter animation per-row scales with row count
- **Page / Component:** `data-table.tsx:164` (`delay: Math.min(idx * 0.015, 0.3)`).
- **Problem:** Staggered row animation is capped at 0.3s but still creates a motion `<tr>` per row — Framer Motion animating 200 table rows on mount is expensive and accessibility-noisy.
- **Severity:** Medium
- **Recommendation:** Animate only the first N rows (e.g. 12) or remove per-row animation once pagination lands; respect `prefers-reduced-motion` (currently ignored in DataTable despite the global CSS rule).
- **Business Impact:** Snappier tables; reduced-motion users get a calm UI.
- **Task:** [U-08]

### 3.3 Forms lack inline validation and step grouping
- **Page / Component:** `admin/students/register/page.tsx` (423 lines), `registrar/students/new/page.tsx` (383), `admin/setup/page.tsx` (501).
- **Problem:** Large single-card forms collect many fields (identity, guardian, academic, medical, documents) in one scroll. Validation appears to be submit-time only; no inline field-level feedback, no step indicator.
- **Severity:** High
- **Recommendation:** Introduce a `<Stepper>` / multi-step form for registration (Identity → Guardian → Academic → Review). Add inline validation (zod + react-hook-form) with accessible error messaging (`aria-invalid`, `aria-describedby`). Provide smart defaults (academic year = current, branch = user's branch).
- **Business Impact:** Fewer abandoned registrations, fewer invalid records, less registrar frustration.
- **Task:** [U-09]

### 3.4 No bulk-action bar wired in list pages
- **Page / Component:** `data-table.tsx:286` has a selection footer ("N of M selected") but the bar only offers "Clear selection" — no actions.
- **Problem:** The selection machinery exists but no page emits bulk actions (e.g. "Mark paid", "Export selected", "Assign class").
- **Severity:** Medium
- **Recommendation:** Let `GenericListPage` accept `bulkActions: {label, icon, onClick(selectedKeys)}` and render them in the selection bar.
- **Business Impact:** Real registrar/finance productivity (mass-assign, mass-export).
- **Task:** [U-10]

### 3.5 No column customization / density toggle
- **Page / Component:** `DataTable`.
- **Problem:** Columns are fixed; users can't hide noisy columns or switch to a compact density for dense data review.
- **Severity:** Low
- **Recommendation:** Add an optional column-visibility dropdown and a `compact` table density (smaller row padding) toggle, persisted per-user in localStorage.
- **Business Impact:** Power-user comfort; minor.
- **Task:** [U-11]

---

## §4 — Dashboards (detail in `DASHBOARD_REDESIGN.md`)

### 4.1 Finance dashboard is busy; lacks focus
- **Page:** `finance/dashboard/page.tsx` (410 lines) — KPIs, period selector, cash-flow funnel, receivables aging, revenue area chart, recent transactions, action alerts, all at once.
- **Severity:** Medium
- **Recommendation:** Lead with the 3 numbers that matter today (Cash available, Outstanding receivables, Net this month) + the action alerts (what needs a human now). Push funnel/aging into a secondary "Analysis" area.
- **Task:** [U-12]

### 4.2 Parent portal child switcher + dashboard data coupling
- **Page:** `parent/dashboard/page.tsx`.
- **Problem:** Selected child drives everything; switching re-renders the whole dashboard but the data was fetched once for all children — good. However the `childMap[selectedChild]` access pattern crashes if `selectedChild` is stale after a refetch.
- **Severity:** Medium
- **Recommendation:** Guard `childMap[selectedChild]` with `|| children[0] || {}` consistently (already partly done) and add a loading boundary per card.
- **Task:** [U-13]

### 4.3 Super-admin dashboard uses demo revenue/health numbers
- **Page:** `super-admin/dashboard/page.tsx` (434 lines).
- **Severity:** High (trust)
- **Recommendation:** Real `/super-admin/monitoring` + `/super-admin/revenue` data; explicit empty states otherwise.
- **Task:** [U-02]

---

## §5 — Empty / Loading / Error States

### 5.1 Dashboards use a full-page spinner; lists use skeletons — inconsistent
- **Page / Component:** `parent/dashboard` (centered `Loader2` over `<AnimatedBackground/>`); `generic-list-page` (3 skeleton rows).
- **Problem:** Dashboards blank to a spinner for the entire page; lists skeleton gracefully. A dashboard with no KPIs visible for 2s feels broken.
- **Severity:** Medium
- **Recommendation:** Dashboard skeletons: KPI placeholder cards + chart skeleton matching layout (per the `DESIGN.md` "Loading skeletons: pulse animation" rule).
- **Task:** [U-14]

### 5.2 `EmptyState` lacks an illustration/role-aware empty copy
- **Component:** `empty-state.tsx`.
- **Problem:** Fine component, but always shows `<Inbox/>`. A "no invoices yet" vs "no students yet" benefit from role/context icons and a primary CTA that's specific.
- **Severity:** Low
- **Recommendation:** Accept an `icon` per usage and always pass a concrete CTA.
- **Task:** [U-15]

### 5.3 Error states are generic "Error"
- **Component:** `generic-list-page` renders `<EmptyState variant="error" title="Error" description={error} />`.
- **Problem:** No retry button, no distinction between 401 (session expired), 403 (view-only), 500 (server).
- **Severity:** Medium
- **Recommendation:** Add a `Retry` action; detect 401 → redirect to login; 403 → show view-only message.
- **Task:** [U-16]

---

## §6 — Accessibility

### 6.1 Good foundations already present (acknowledge)
Skip link, focus-trapped mobile drawer + command palette, `aria-current`, `aria-sort`, `aria-modal`, schema.org breadcrumbs, `prefers-reduced-motion` global, keyboard-activatable rows. This is above average.

### 6.2 Color contrast — verify role accent hues
- **Component:** `ROLE_ACCENT` (`navigation.ts:294`) — accents like `hue: 15` (red-orange) and `hue: 30` (orange) at 70%/50% lightness on white may fall below 4.5:1 for small text.
- **Severity:** Medium
- **Recommendation:** Run an automated contrast audit (axe-core) on each role's dashboard; bump accent lightness for text usage or restrict accents to non-text decorative elements (the left border, the "Z" badge).
- **Task:** [U-17]

### 6.3 KPI value uses `bg-clip-text text-transparent` gradient
- **Component:** `kpi-card.tsx:73`.
- **Problem:** Gradient-clipped text can render with low contrast or fail to clip in some browsers; screen readers read it fine but visually it can wash out.
- **Severity:** Low
- **Recommendation:** Use solid `text-foreground` for the KPI number; keep gradients for decorative elements only.
- **Task:** [U-18]

### 6.4 Focus visible is implemented but skip-to-main target order
- **Component:** `role-layout.tsx:211` SkipLink → `#main-content` (main has `tabIndex={-1}`). Good. Ensure the command palette returns focus on close (it traps but doesn't restore focus to the trigger).
- **Severity:** Low
- **Recommendation:** Restore focus to the search button after ⌘K closes.
- **Task:** [U-19]

---

## §7 — Visual Consistency & Polish

### 7.1 Mixed radii: `rounded-xl` (buttons/inputs), `rounded-2xl` (cards), `rounded-lg` (period toggles)
- **Severity:** Low
- **Recommendation:** Formalize the radius scale (see `DESIGN_SYSTEM.md`): `sm=8px`, `md=12px`, `lg=16px`, `xl=20px`. Apply consistently: inputs/buttons→md, cards→lg, modals→xl.
- **Task:** [U-20]

### 7.2 Glassmorphism everywhere reduces legibility on busy backgrounds
- **Component:** `.glass` on header + sidebar + cards + modals.
- **Problem:** Stacked translucent surfaces over the (former) animated background produce muddy layering; text contrast suffers.
- **Severity:** Medium (largely self-resolves once [U-01] removes the 3D bg)
- **Recommendation:** Keep `.glass` for the top header and mobile drawer only; cards should be opaque `bg-card`.
- **Task:** [U-01]

### 7.3 Shadows are inconsistent (`shadow-sm`, `shadow-md`, `shadow-lg`, custom `shadow-[0_4px_14px...]`)
- **Severity:** Low
- **Recommendation:** Define 4 elevation tokens (see `DESIGN_SYSTEM.md`) and use them by name.
- **Task:** [U-20]

---

## §8 — Mobile / Responsive

### 8.1 Authenticated layouts are responsive (good)
`RoleLayout` has a real mobile drawer; `DataTable` has a card view; `GenericListPage` collapses filters behind a button. This is solid.

### 8.2 Dashboards are desktop-first; KPI grids reflow but chart heights are fixed
- **Page:** dashboards use `h-[280px]` chart wrappers; on small screens two charts stack but the page is long.
- **Severity:** Medium
- **Recommendation:** Reduce chart height on mobile (`h-[220px] md:h-[280px]`); show fewer KPIs above the fold on mobile (top 3).
- **Task:** [U-21]

### 8.3 POS (cafeteria) — verify touch targets
- **Page:** `cafeteria/pos`.
- **Problem:** POS is the canonical touch surface; need ≥44px targets, sticky totals, and an offline indicator.
- **Severity:** Medium
- **Recommendation:** Audit POS for 44px min touch targets, large numeric keypad, sticky checkout bar.
- **Task:** [U-22]

---

## §9 — Frontend Production Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Design system quality | 8.5 / 10 | Tokens, variants, motion-aware, accessible primitives |
| Component coverage | 8 / 10 | Strong primitive set; missing Pagination, Stepper, Skeleton(variants) |
| Information architecture | 7 / 10 | Good role IA; dual-nav and director duplication drag it down |
| Performance | 4 / 10 | WebGL on every page + hardcoded heavy charts |
| Data realism | 3 / 10 | Dashboards ship demo numbers |
| Accessibility | 7.5 / 10 | Strong base; contrast/focus-restore gaps |
| Mobile responsiveness | 7 / 10 | Layouts responsive; dashboards dense on phone |
| Consistency / polish | 7 / 10 | Radii/shadow/glass need formalizing |
| **Overall frontend** | **6.5 / 10** | Fix [U-01..U-04] (perf + data + nav de-dupe) → 8/10; full P1/P2 → 9/10. |

The frontend is **ahead of typical ERP frontends** in craft; it is held back by performance and "demo realism", not by design taste. The fix list is short and high-leverage.
