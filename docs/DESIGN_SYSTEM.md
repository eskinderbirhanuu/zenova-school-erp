# Design System — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 (Design System Architect)

This is the **canonical** design system spec. It formalizes what already exists in `globals.css` + the component primitives, fills the gaps surfaced in `UI_AUDIT.md`, and gives DeepSeek a single source of truth. Where the current code disagrees with this doc, **this doc wins** and the code should be migrated to it.

**Stack:** Tailwind v4 `@theme` tokens · HSL CSS variables · Radix UI primitives · `class-variance-authority` · Framer Motion (motion-aware) · Inter.

---

## 1. Design Principles

1. **Calm over flashy.** Data screens must be readable first. Decoration (3D, glass, gradients) is reserved for marketing/welcome surfaces only.
2. **Density with breathing room.** Enterprise users want information density, not whitespace theater — but never crowded. 4px grid, generous card padding (`p-6`), compact table density optional.
3. **Motion is meaning.** Animate state changes and focus, not idle decoration. Always honor `prefers-reduced-motion`.
4. **Accessible by default.** 4.5:1 contrast on text, 44px touch targets, visible focus, keyboard-complete flows.
5. **One source of truth.** Every color/radius/shadow/spacing is a token — no inline magic numbers.

---

## 2. Typography

**Font families**
| Token | Family | Use |
|-------|--------|-----|
| `--font-sans` | Inter | Body, UI, headings |
| `--font-mono` | JetBrains Mono | IDs, codes, kbd, tabular numbers in data |

> Already set in `globals.css`. Load Inter via `next/font/google` (self-hosted, no layout shift) — verify it's wired in `layout.tsx` (currently relies on system fallback).

**Type scale (Tailwind classes → px)**
| Role | Class | Size | Weight | Tracking | Use |
|------|-------|------|--------|----------|-----|
| Hero | `text-3xl` | 30px | 700 (bold) | -0.02em | Page title (one per page) |
| H2 / Section | `text-xl` | 20px | 600 | -0.01em | Section header |
| H3 / Card title | `text-base` | 16px | 600 | normal | Card title |
| KPI value | `text-3xl` | 30px | 700 | -0.02em | KPI number (**solid color**, not gradient) |
| Body | `text-sm` | 14px | 400 | normal | Default |
| Small / label | `text-xs` | 12px | 500 | 0.05em UPPER | Labels, table headers |

> The existing `DESIGN.md` lists `text-2xl` for KPI; code uses `text-3xl`. Adopt `text-3xl` and update `DESIGN.md` to match.

---

## 3. Color System

### Semantic tokens (already in `globals.css`)
| Token | Light HSL | Dark HSL | Use |
|-------|-----------|----------|-----|
| `--background` | 210 40% 98% | 210 40% 4% | Page bg |
| `--foreground` | 210 40% 2% | 0 0% 98% | Default text |
| `--card` | 0 0% 100% | 210 40% 8% | Card bg (**opaque**, not glass) |
| `--primary` | 200 98% 32% | 200 98% 32% | CTAs, active states |
| `--primary-foreground` | 0 0% 100% | 0 0% 100% | Text on primary |
| `--secondary` | 210 20% 92% | 215 20% 25% | Secondary buttons |
| `--muted` | 210 20% 94% | 215 20% 15% | Subtle bg |
| `--muted-foreground` | 215 20% 40% | 215 20% 65% | Secondary text |
| `--accent` | 210 40% 96% | 210 40% 15% | Hover bg |
| `--destructive` | 0 84% 60% | 0 62% 30% | Delete, error |
| `--border` | 210 20% 90% | 210 25% 18% | Borders |

### Status colors (formalize — currently ad-hoc `emerald-500/10` etc.)
| Status | Token to add | Light | Use |
|--------|--------------|-------|-----|
| Success | `--success` | 160 84% 39% | Confirmations, paid, present |
| Warning | `--warning` | 38 92% 50% | Pending, overdue soon |
| Danger | `--destructive` | 0 84% 60% | Errors, delete, absent |
| Info | `--info` | 200 98% 40% | Informational badges |

Add `success`/`warning`/`info` + `-foreground` pairs to `globals.css` so badges stop hard-coding Tailwind palette names. Map to `StatusBadge` variants.

### Chart palette (already present)
`--chart-1..5` = primary blue / emerald / violet / amber / red. Use in fixed order for series.

### Role accents (already in `navigation.ts`)
`ROLE_ACCENT` per role — **restrict to non-text decorative use** (sidebar left border, the "Z" badge, active pill bg). Never use the accent hue for body text — several (orange/red-orange) fail contrast on white. See `UI_AUDIT.md` §6.2.

### Dark mode
Already wired via `.dark` class + `next-themes` dependency present in `package.json`. **Verify** a `<ThemeProvider>` from `next-themes` is mounted in `layout.tsx` (currently not visible) and a theme toggle exists; the tokens are ready, the plumbing may be missing.

---

## 4. Spacing — 4px grid

Use Tailwind's default scale (already 4px-based). Allowed stops for layout: `1, 2, 3, 4, 5, 6, 8, 10, 12`. Card padding = `p-6` (24px). Page padding = `p-4 lg:p-8` (already). Gap between cards = `gap-4`/`gap-5`. Avoid `p-7`, `gap-6.5`, etc.

---

## 5. Radius System

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Badges, small chips, checkboxes |
| `--radius-md` | 12px | **Buttons, inputs** |
| `--radius-lg` | 16px | **Cards** |
| `--radius-xl` | 20px | Modals, large surfaces |
| full | 9999px | Avatars, pills |

> Current code mixes `rounded-lg` (period toggles), `rounded-xl` (buttons/inputs), `rounded-2xl` (cards). Tailwind v4 maps `rounded-lg`=0.5rem, `rounded-xl`=0.75rem, `rounded-2xl`=1rem. The `@theme` already sets `--radius-lg: var(--radius)` (0.75rem). **Standardize**: buttons/inputs→`rounded-xl`, cards→`rounded-2xl`, modals→`rounded-2xl`, period toggles→`rounded-lg`. Update `button.tsx`/`input.tsx` to `rounded-xl` (already) and align the rest.

---

## 6. Shadows — Elevation tokens

Define four named elevations (replace ad-hoc `shadow-sm/md/lg/[custom]`):

| Token | Value | Use |
|-------|-------|-----|
| `elev-1` | `0 1px 2px rgba(0,0,0,.04)` | Resting cards, inputs |
| `elev-2` | `0 2px 8px rgba(0,0,0,.06)` | Cards on hover, dropdowns |
| `elev-3` | `0 8px 24px rgba(0,0,0,.08)` | Modals, popovers |
| `elev-primary` | `0 4px 14px rgba(3,105,161,.10)` → hover `.15` | Primary CTA only |

Add as CSS vars / Tailwind theme extension; reference by class (`shadow-elev-1`). The `card.tsx` `colored` variant already approximates `elev-primary`.

---

## 7. Components

| Component | Status | Spec notes |
|-----------|--------|------------|
| **Button** | ✅ exists | Variants: default/outline/secondary/ghost/destructive/link. Sizes: sm/default/lg/icon. Keep `active:scale-[0.97]`. Add a `loading` prop (spinner) to replace ad-hoc usage. |
| **Input / Select / Checkbox / Label** | ✅ exists | Inputs `h-10`, `rounded-xl`. Add error state: `aria-invalid` + red ring + helper text slot. |
| **Card** | ✅ exists | `rounded-2xl`, opaque `bg-card`. Demote `glass` variant to header/drawer only. |
| **KPI Card** | ✅ exists | **Change gradient-clipped value to solid `text-foreground`** ([U-18]). Keep sparkline, trend pill, accent bar. |
| **Status Badge** | ✅ exists | Map to success/warning/info/destructive tokens (no hard-coded palette). |
| **Data Table** | ✅ exists | Add `Pagination`, optional column visibility, compact density, reduced-motion respect. |
| **Empty State** | ✅ exists | Accept per-use `icon`; always pass a concrete CTA. |
| **Page Header / Section Header** | ✅ exists | One H1 per page (hero). |
| **Generic List Page** | ✅ exists | Add `bulkActions`, `Pagination` slot. |
| **Generic Form Card** | ✅ exists | Pair with new **Stepper** for multi-step. |
| **Generic Detail Card** | ✅ exists | — |
| **Pagination** | ❌ missing | Build: prev/next + page numbers + ellipsis; keyboard; `aria-current="page"`. |
| **Stepper** | ❌ missing | Build: horizontal steps, clickable, validates-before-next. |
| **Skeleton** | ⚠ partial | List skeleton exists; add **dashboard skeleton** (KPI + chart placeholders) ([U-14]). |
| **Modal/Dialog** | via Radix | Wrap into a typed `Modal` with size variants (sm/md/lg). |
| **Toast** | ✅ exists | — |
| **Dropdown Menu** | via Radix | — |
| **Tabs** | via Radix | Ensure `aria-orientation` and keyboard arrows. |
| **Command Palette** | ✅ exists | Extend to actions + records ([U-06]). |

---

## 8. Icons

`lucide-react` (already). Rules:
- Default size `h-4 w-4` (16px) inline; `h-5 w-5` (20px) in header/nav; `h-8 w-8` in empty states.
- Always `aria-hidden` on decorative icons; labelled icon-only buttons need `aria-label`.
- One icon per concept (e.g. always `DollarSign` for money — don't mix `CreditCard`/`Wallet` for the same meaning).

---

## 9. Animation

| Use | Duration | Easing |
|-----|----------|--------|
| Page enter | 0.4s | ease-out, translateY(10px) |
| Card hover | 0.2s | ease-out, y(-2px) + elev-2 |
| Button press | 0.15s | scale(0.97) |
| Modal/drawer | 0.3s | ease-out |
| Row stagger | ≤0.3s cap | — |

Already mostly implemented. **Rules:**
- `prefers-reduced-motion: reduce` → all animations near-instant (global CSS already does this; ensure JS-driven motion via `useReducedMotion()` is checked in every animated component — `DataTable` currently does **not** check it; fix in [U-08]).
- No idle/looping animation on data screens (kills the WebGL background per [U-01]).

---

## 10. Responsive Rules

| Breakpoint | Behavior |
|-----------|----------|
| `<640px` (sm) | Single column; mobile drawer nav; table → card view; ≤3 KPIs; chart height 220px |
| `640–1024px` (md) | 2-column KPI grids; table appears; filters inline |
| `≥1024px` (lg) | Sidebar visible (collapsible to 68px rail); 3–4 KPI columns; chart height 280px |
| `≥1280px` (xl) | Max content width 1400px centered; bento grids |

Touch targets ≥44px on `<lg`. POS is touch-first ([U-22]).

---

## 11. Z-Index Scale (already in `DESIGN.md`, keep)

| Layer | Z |
|-------|---|
| Background fixed | -10 |
| Content | 0 |
| Elevated (cards) | 10 |
| Nav (header/sidebar) | 50 |
| Overlay (drawer/modal) | 100 |
| Tooltip/dropdown | 500 |
| Toast | 1000 |
| Command palette | 100 (within overlay tier) — currently `z-[100]`, fine |

---

## 12. What to change in `globals.css` (concrete)

1. Add `--success`, `--warning`, `--info` (+ foreground) tokens for both `:root` and `.dark`.
2. Add elevation shadow vars (`--shadow-elev-1..3`, `--shadow-elev-primary`).
3. Confirm `next/font` Inter wiring (or add it) to remove the system-font fallback flash.
4. Keep `.glass` but document it as **header + drawer only**.
5. Keep the reduced-motion block; also gate JS motion everywhere.

---

## 13. Adoption checklist (for DeepSeek)

- [ ] Tokens added to `globals.css` (success/warning/info/shadows).
- [ ] `next/font` Inter wired in root layout.
- [ ] `StatusBadge` consumes semantic tokens (no `emerald-500` literals).
- [ ] KPI value is solid color.
- [ ] Buttons/inputs `rounded-xl`, cards/modals `rounded-2xl` everywhere.
- [ ] `.glass` only on header + mobile drawer.
- [ ] `DataTable` respects `prefers-reduced-motion`; `Pagination` + density added.
- [ ] New `Stepper` + `Modal` + dashboard `Skeleton` primitives.
- [ ] `ThemeProvider` (next-themes) mounted; theme toggle in header.

This system is already 80% in place; this doc exists to make the remaining 20% explicit and enforceable.
