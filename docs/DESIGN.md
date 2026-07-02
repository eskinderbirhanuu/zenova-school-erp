# Design System

## Philosophy

Premium SaaS. Enterprise Grade. Modern. Minimal. Elegant. Fast. Professional. Inspired by Linear, Stripe, Notion, Framer, Vercel — but uniquely ZENOVA.

## Layout Principles

- **Grid**: Base 4px grid, generous whitespace, bento grid card layouts, max content width 1400px
- **Page padding**: `py-6 px-6` (24px)
- **Z-Index**: Background(-10) → Content(0) → Elevated(10) → Nav(50) → Overlay(100) → Tooltip(500) → Toast(1000)

## Color System

### Primary Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Primary | #0369A1 | CTAs, links, active states |
| Primary Light | #BAE6FD | Hover backgrounds |
| Primary Dark | #025985 | Pressed states |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| Success | #10B981 | Confirmations, active |
| Warning | #F59E0B | Alerts, pending |
| Destructive | #DC2626 | Errors, delete |
| Info | #0284C7 | Information |

### Chart Palette
#0369A1, #10B981, #8B5CF6, #F59E0B, #DC2626

## Typography

| Element | Font | Size | Weight | Tracking |
|---------|------|------|--------|----------|
| Hero Title | Inter | 32px | 700 | -0.02em |
| Section Title | Inter | 18px | 600 | -0.01em |
| Card Title | Inter | 16px | 600 | normal |
| Body | Inter | 14px | 400 | normal |
| KPI Value | Inter | 24px | 700 | -0.02em |
| Label | Inter | 12px | 500 | 0.05em uppercase |

## Component Rules

### Cards
- Background: `--card` (#FFFFFF), Border: `rounded-xl`, Shadow: `shadow-sm` / `shadow-md` on hover
- Inner padding: `p-6`, Transition: `transition-all duration-200`

### KPICard
- Icon in `rounded-lg bg-primary/5 p-2.5 text-primary`
- Value in `text-2xl font-bold tracking-tight`
- Description in `text-sm text-muted-foreground`
- Optional trend indicator with arrow + color

### Buttons
| Variant | Style |
|---------|-------|
| Primary | `bg-primary text-white shadow-sm hover:bg-primary/90` |
| Secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| Outline | `border border-input bg-background hover:bg-accent` |
| Ghost | `hover:bg-accent hover:text-accent-foreground` |
| Loading | Loader2 spinner + disabled |

### Tables
- Header: `text-xs font-medium uppercase tracking-wider text-muted-foreground`
- Row: `border-b last:border-0 hover:bg-muted/30 transition-colors`
- Sticky header on scroll, optional zebra striping
- Cell padding: `px-4 py-3`

### PageHeader (use on ALL pages)
```tsx
<PageHeader
  title="Branches"
  description="Manage school branches"
  actions={<Button><Plus /> New</Button>}
/>
```

### EmptyState
Icon + title + description + optional action button.

### Loading State
```tsx
<div className="flex items-center justify-center min-h-[60vh]">
  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
</div>
```

## Motion

- Page transitions: 0.4s ease-out fade + translateY(10px)
- Card hover: 0.2s ease-out shadow lift
- Button hover: 0.15s ease-out scale(1.02)
- Loading skeletons: pulse animation
- Drawer: 0.3s ease-out translateX

## Dashboard Rules

Every dashboard must include:
1. Hero Header with title + description + contextual actions
2. KPI Cards row (4-6 cards)
3. Analytics section (charts)
4. Recent Activity section
5. Quick Actions or Contextual Panel

## Sub-Page Patterns

### List Pages
```
PageHeader (title + description + primary action)
Toolbar (search + filters + bulk actions) [optional]
Summary Cards (2-3 KPICards above table) [optional]
DataTable Card (main content with pagination)
EmptyState when no data
```

### Form Pages
```
PageHeader (back button + title + description)
Progress Steps (if multi-step) [optional]
Form Card with section headers, icons, grid fields
Validation feedback
Submit button (w-full h-11)
Success State (centered)
```

### Detail Pages
```
PageHeader (title + back button + actions)
Info Card (key-value pairs in grid)
Related Data (tables, lists)
Activity Feed / Audit Trail
```

## Spacing Rules

| Element | Spacing |
|---------|---------|
| Page padding | `py-6 px-6` |
| Hero to content | `mb-8` |
| Between sections | `space-y-8` |
| Between cards in grid | `gap-4` |
| Card internal padding | `p-6` |
| Table row padding | `px-4 py-3` |

## Accessibility Requirements

- Table: `aria-label`, `scope="col"` on headers
- Forms: `label` with `htmlFor`, `aria-invalid`
- Buttons: `aria-label` on icon-only buttons
- Focus: visible `ring-2 ring-primary` on all interactive elements

## 3D Animations

- framer-motion: FadeInUp, StaggerContainer/StaggerItem, ScaleIn
- three.js + @react-three/fiber + @react-three/drei
- AnimatedBackground: Floating 3D geometric wireframe shapes
- InteractiveModel: ZENOVA orb (wireframe icosahedron + rotating rings, OrbitControls)
- All 13 dashboards have 3D background + staggered micro-animations
