# UI Technical Debt — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2
Debt register for the frontend. Each item: what it is, why it matters, the fix. Task IDs `[U-NN]` → `DEEPSEEK_UI_TASKS.md`.

---

### 1. Duplicate navigation systems
- **What:** `components/layout/sidebar.tsx` (hard-coded `navItems` with `roles[]`) coexists with `config/navigation.ts` + `RoleLayout`.
- **Why it matters:** Two sources of truth; nav drift; REVIEWS.md already flagged this.
- **Fix:** Delete `sidebar.tsx`; make `navigation.ts` the only source; grep/remove `<Sidebar` imports. [U-04]

### 2. WebGL background on every dashboard
- **What:** `<AnimatedBackground>` (Three.js, 7 animated meshes) imported by finance/parent/student/teacher/super-admin dashboards.
- **Why it matters:** ~600KB JS, per-frame GPU render on data screens, battery/CPU drain on school hardware + parent phones.
- **Fix:** Replace with static gradient mesh on all authenticated pages; keep WebGL only on welcome/marketing. [U-01]

### 3. Hardcoded demo data in dashboards
- **What:** `finance/dashboard` (and admin/super-admin/registrar/teacher) ship literal arrays (`revenueData`, `recentTransactions`, etc.).
- **Why it matters:** Misleading; trust blocker.
- **Fix:** Wire to real APIs; empty states otherwise; single `MOCK_DASHBOARD_DATA` flag off in prod. [U-02]

### 4. `package.json` runs Next via `--webpack` (WASM SWC fallback)
- **What:** `"dev": "next dev --webpack"` and `"build": "next build --webpack"` because the SWC binary is incompatible on the dev machine.
- **Why it matters:** Slower builds; in production (Linux) the native SWC binary works and should be used — the `--webpack` flag disables turbopack/SWC optimizations.
- **Fix:** Remove `--webpack` for production builds; keep SWC binaries in lockfile for all target platforms (`@next/swc-linux-x64-gnu`, etc.); document the dev-only workaround. [U-34]

### 5. `next-themes` installed but no visible `ThemeProvider`
- **What:** `next-themes` is a dependency; dark tokens exist in `globals.css`; but `layout.tsx` doesn't mount `<ThemeProvider>`.
- **Why it matters:** Dark mode tokens are defined but unusable; users can't toggle.
- **Fix:** Mount `ThemeProvider attribute="class"` in root layout; add a theme toggle in the header; default to system. [U-35]

### 6. Hard-coded palette classes (`emerald-500/10`, `text-emerald-600`, `bg-sky-500`...)
- **What:** Status colors written as raw Tailwind palette names across dashboards/badges.
- **Why it matters:** Bypasses the token system; inconsistent dark mode; can't retheme.
- **Fix:** Add `success/warning/info` tokens; tokenize `StatusBadge`; sweep usages. [U-30]

### 7. Inconsistent radii / shadows
- **What:** Mix of `rounded-lg/xl/2xl` and `shadow-sm/md/lg/[custom]`.
- **Why it matters:** Visual inconsistency.
- **Fix:** Adopt radius scale (inputs/buttons `xl`, cards/modals `2xl`); elevation tokens. [U-20]

### 8. No client-side pagination/virtualization on `DataTable`
- **What:** Renders every row; no `Pagination`.
- **Why it matters:** Freezes on real volumes.
- **Fix:** `Pagination` + server-mode; optionally virtualize. [U-08]

### 9. `DataTable` ignores `prefers-reduced-motion`
- **What:** Animates every row on mount regardless of preference.
- **Why it matters:** A11y/comfort; the rest of the app honors it.
- **Fix:** Use `useReducedMotion()`; cap stagger to first 12 rows. [U-08]

### 10. `caption` rendered outside `<table>`
- **What:** `data-table.tsx:111` renders `<caption className="sr-only">` as a sibling of the table, not inside.
- **Why it matters:** Invalid HTML; screen readers won't associate the caption with the table.
- **Fix:** Move `<caption>` inside `<table>`. [U-08]

### 11. KPI value uses gradient `bg-clip-text`
- **What:** `kpi-card.tsx:73`.
- **Why it matters:** Contrast risk; non-standard rendering.
- **Fix:** Solid `text-foreground`. [U-18]

### 12. Command palette focus not restored
- **What:** ⌘K traps focus but doesn't return it to the trigger on close.
- **Why it matters:** Keyboard users lose their place.
- **Fix:** Store trigger on open; restore on close. [U-19]

### 13. Role accent hues used for text
- **What:** `ROLE_ACCENT` (e.g. orange/red-orange) applied in places that include text.
- **Why it matters:** Several fail 4.5:1 on white.
- **Fix:** Restrict accents to non-text decoration. [U-17]

### 14. Large monolithic page components
- **What:** `admin/setup` (501), `page.tsx` root (486), `super-admin/dashboard` (434), `admin/students/register` (423), `finance/dashboard` (410).
- **Why it matters:** Hard to test, slow to review, repeated logic.
- **Fix:** Extract sub-components/widgets (e.g. `CashFlowFunnel`, `ReceivableAging` already started) into `components/<module>/`; keep pages as composition. [U-36]

### 15. Director module duplicates each department
- **What:** `DIRECTOR_NAV` links `/director/finance`, `/director/hr`, ... implying a second copy of each module.
- **Why it matters:** Likely stub pages; sidebar bloat.
- **Fix:** Link directors to the real modules with `?view=oversight` + view-only banner. [U-07]

### 16. No form-validation library
- **What:** Validation is ad-hoc per page.
- **Why it matters:** Inconsistent UX, duplicated effort, error-prone.
- **Fix:** Adopt `react-hook-form` + `zod`; share schemas with backend contract. [U-09]

### 17. No frontend test suite
- **What:** No component / e2e tests visible.
- **Why it matters:** Regressions (several documented) slip through.
- **Fix:** Add Playwright for the critical paths (login, register student, create invoice, parent pay) + component tests for primitives. [U-33]

### 18. `AnimatedBackground` + `micro-animations` imported via `@/components/3d`
- **What:** Folder named `3d` mixes WebGL (`animated-background`, `interactive-model`) with plain motion helpers (`FadeInUp`, `StaggerContainer`).
- **Why it matters:** The motion helpers are used widely and don't need the "3d" framing; bundlers can't tree-shake the WebGL imports cleanly if paths are loose.
- **Fix:** Split: `components/motion/` (cheap helpers) vs `components/webgl/` (lazy, heavy). Lazy-import the WebGL ones. [U-01]

### 19. `motion.tr` inside `<tbody>`
- **What:** `data-table.tsx:164` uses Framer Motion's `motion.tr`. Animating `<tr>` can cause layout thrash and React reconciliation warnings in some browsers.
- **Why it matters:** Perf + occasional console errors.
- **Fix:** Prefer animating a `<td>` inner div or a wrapper; keep `<tr>` static once pagination lands. [U-08]

### 20. `user_role` cookie casing (`Finance` vs `FINANCE`)
- **What:** REVIEWS.md contradiction #5 — `normalizeUser()` handles case, but the RBAC map keys are uppercase; middleware reads `user_role` raw.
- **Why it matters:** A lowercase role cookie could bypass `ROLE_PREFIXES` and redirect to `/unauthorized`.
- **Fix:** Normalize role to upper on login (set cookie upper) and in `normalizeUser`; add a test. [U-37]

---

## Debt severity summary

| # | Item | Severity |
|---|------|----------|
| 2,3 | WebGL bg + demo data | Critical (perf + trust) |
| 1 | Duplicate nav | High |
| 4 | `--webpack` in prod | High |
| 5 | Missing ThemeProvider | High |
| 8 | No pagination | High |
| 16,17 | No form lib / no tests | High |
| 6,7,9,10,11,12,13 | A11y/consistency | Medium |
| 14,15,18,19,20 | Structure/cleanup | Medium-Low |

Resolving the Critical/High items (≈10) takes the frontend from 6.5/10 to ~8.5/10 with **no rewrite**.
