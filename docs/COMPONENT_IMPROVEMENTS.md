# Component Improvements — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 (Senior UI Engineer)
**Scope:** Concrete per-component upgrades. Task IDs `[U-NN]` → `DEEPSEEK_UI_TASKS.md`.

The existing primitive set (`button`, `card`, `input`, `kpi-card`, `data-table`, `empty-state`, `generic-list-page`, `generic-form-card`, `generic-detail-card`, `status-badge`, `trend-indicator`, `page-header`, `section-header`, `select`, `badge`, `avatar`, `dropdown-menu`, `toast`) is strong. This file lists **additions and targeted edits**, not rewrites.

---

## 1. Button
- **Current:** variants default/destructive/outline/secondary/ghost/link; sizes default/sm/lg/icon; `active:scale-[0.97]`.
- **Change:**
  - Add `loading?: boolean` → renders `<Loader2 className="animate-spin"/>` and sets `disabled` + `aria-busy="true"`. Removes ad-hoc `loading ? <Loader2/>...` repeated in pages.
  - Add `size="xs"` (`h-7 px-2.5 text-[11px]`) for dense table-row actions.
  - Keep `rounded-xl`.
- **Task:** [U-27]

## 2. Input / Select / Checkbox / Label
- **Current:** no error-affordance; helper text is ad-hoc.
- **Change:**
  - Add `error?: string` prop to `Input`/`Select`/`Textarea` → `aria-invalid="true"`, red ring (`focus-visible:ring-destructive/40 border-destructive/50`), and render a `<p role="alert" className="text-xs text-destructive mt-1">{error}</p>`.
  - Add a `<Field>` wrapper: `<Label>` + control + helper/error, with `htmlFor` wiring.
  - Promote to a `Textarea` primitive (currently inline).
- **Task:** [U-28]

## 3. Card
- **Current:** `rounded-2xl`, variants default/md/lg/colored/none/glass.
- **Change:**
  - Default to **opaque** `bg-card`; demote `glass` to header/drawer only (per DESIGN_SYSTEM §7).
  - Consume elevation tokens (`elev-1` rest, `elev-2` hover) instead of `shadow-sm/md/lg`.
- **Task:** [U-20]

## 4. KPI Card
- **Current:** gradient-clipped value, sparkline, trend, accent bar.
- **Change:**
  - **Value = solid `text-foreground`** (gradient text harms contrast) ([U-18]).
  - Make the **whole card clickable** via an optional `href` → wrap in `next/link`.
  - Add `deltaSince` tooltip ("vs last month: +5%").
- **Task:** [U-18]

## 5. Data Table  (biggest component changes)
- **Current:** sortable, selectable, responsive card view, selection footer.
- **Change:**
  - **Respect `prefers-reduced-motion`** (currently animates every row regardless) ([U-08]).
  - Cap staggered row animation to first 12 rows; rest static.
  - **`Pagination` slot** + server-mode props (`page`, `pageSize`, `total`, `onPageChange`) ([U-08]).
  - **`density`** prop (`comfortable` | `compact`) — compact reduces `py-3.5`→`py-2`.
  - **`columnVisibility`** — a dropdown to toggle columns; persisted to `localStorage` per table key ([U-11]).
  - **Sticky header** (`sticky top-0` on `<thead>`) inside a scroll container.
  - Fix a11y: `caption` is rendered as `<caption>` but outside the `<table>` — move it inside.
- **Task:** [U-08], [U-11]

## 6. Pagination  (NEW)
- Build `Pagination({ page, pageSize, total, onPageChange, siblingCount=1 })`:
  - Prev / Next buttons (disabled at bounds, `aria-disabled`).
  - Numbered pages with ellipsis; `aria-current="page"` on active.
  - Optional page-size selector (`10/25/50/100`).
  - Keyboard: arrows when focused.
- **Task:** [U-08]

## 7. Stepper  (NEW)
- Build `Stepper({ steps: {title, optional?}[], current, completed })`:
  - Horizontal on `md+`, vertical collapse on mobile.
  - Click a completed step to jump back; can't click ahead past first invalid.
  - `aria-current="step"`, numbered circles, check icon when complete.
- Used by [U-09] (registration), [U-26] (activation).
- **Task:** [U-09]

## 8. Modal / Dialog  (NEW wrapper)
- Wrap `@radix-ui/react-dialog` into `Modal({ title, description, size='md', children, footer })`.
- Sizes sm/md/lg/xl (max-w 400/520/680/820).
- Focus trap + restore handled by Radix; add `motion` scale-in.
- Used everywhere we currently use ad-hoc overlays.
- **Task:** [U-29]

## 9. Skeleton  (extend)
- **Current:** ad-hoc `animate-pulse` divs.
- **Change:** add `<Skeleton variant="kpi" | "chart" | "row" | "text">` plus a `<DashboardSkeleton>` composition matching `DASHBOARD_REDESIGN.md` §10 ([U-14]).
- **Task:** [U-14]

## 10. Status Badge
- **Current:** variant prop.
- **Change:** map variants strictly to semantic tokens (`success/warning/info/destructive/neutral`); remove raw palette classes; add `dot` variant (leading colored dot) for tables.
- **Task:** [U-30]

## 11. Empty State
- **Current:** variant empty/loading/error + optional action.
- **Change:**
  - Add `icon?: ReactNode` (lucide) and require a concrete `action` in non-error usage.
  - Add `illustration?: ReactNode` for big empty states (e.g. first-run).
  - Error variant adds `retry?: () => void`.
- **Task:** [U-15]

## 12. Toast
- **Current:** exists.
- **Change:** add `variant="success" | "warning" | "destructive" | "info"` mapping to tokens; ensure `role="status"` for success/info and `role="alert"` for errors; auto-dismiss success at 4s, errors at 0 (sticky until closed).

## 13. Tabs
- Ensure Radix Tabs include `arrow-key` handling (Radix does by default) and `aria-orientation`; add an underline variant for dashboards.

## 14. Command Palette (extend)
- **Current:** nav-only.
- **Change:** three sections — Pages (existing), Quick Actions (`onAction`), Records (async `onSearch(query) → {id,label,sub}[]` with 200ms debounce) ([U-06]).
- **Restore focus** to trigger button on close ([U-19]).
- **Task:** [U-06]

## 15. Notification Bell + Inbox
- Bell dropdown → "See all" → `/notifications` inbox grouped by type, read/unread, preferences link.
- **Task:** [U-25]

## 16. Generic List Page
- Add `bulkActions: {label, icon, onClick(keys), destructive?}[]` rendered in the selection bar ([U-10]).
- Add `pagination` slot + wire to `Pagination` ([U-08]).
- Add `loading` skeleton variant (not just rows).

## 17. Generic Form Card
- Pair with `Stepper` for multi-step mode: `steps` prop switches the card to stepped.
- Add `stickySubmitBar` option for long forms (action bar sticks to bottom on mobile).

## 18. Forms — validation layer (NEW, cross-cutting)
- Introduce `react-hook-form` + `zod` for registration/setup/payment forms.
- Shared `zod` schemas mirror the backend Pydantic schemas (single source: types come from the API contract).
- `<Field>` wrapper (#2) renders the error from form state.
- **Task:** [U-09]

---

## Component readiness matrix

| Component | Today | After tasks |
|-----------|-------|-------------|
| Button | ✅ | ✅ +loading/xs |
| Input/Field | ⚠ | ✅ error/Field |
| Card | ✅ | ✅ opaque/elev |
| KPI Card | ✅ | ✅ solid/clickable |
| Data Table | ✅ | ✅ a11y/paginate/density |
| Pagination | ❌ | ✅ |
| Stepper | ❌ | ✅ |
| Modal | partial | ✅ |
| Skeleton | partial | ✅ variants |
| Status Badge | ✅ | ✅ tokenized |
| Empty State | ✅ | ✅ icon/retry |
| Toast | ✅ | ✅ variants |
| Command Palette | ✅ | ✅ records/actions |
| Notifications | partial | ✅ inbox |

Result: a complete, consistent, accessible enterprise component library — with **zero** rewrite of what already works.
