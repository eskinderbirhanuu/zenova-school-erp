# ZENOVA Sub-Page Design Specification

## Overview
This document provides the master design specification for ALL 118 sub-pages in ZENOVA. Every sub-page must follow these patterns to ensure a premium, consistent SaaS experience.

## Page Types

### 1. List Pages (branches, teachers, students, etc.)
**Layout Pattern:**
```
PageHeader (title + description + primary action button)
Toolbar (search + filters + bulk actions) [optional]
Summary Cards (2-3 KPICards above table) [optional]
DataTable Card (main content)
  - Table with sticky header, zebra striping, hover states
  - Pagination below table
  - EmptyState when no data
```

**Card Style:** `shadow-sm rounded-xl border border-border/50, if present`

**Table Style:**
- Header: `bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground`
- Row: `border-b last:border-0 hover:bg-muted/30 transition-colors`
- Cell padding: `px-4 py-3`
- Status: `StatusBadge` component with variant
- Actions: dropdown or single button

### 2. Form Pages (new teacher, new branch, etc.)
**Layout Pattern:**
```
PageHeader (back button + title + description)
Progress Steps (if multi-step) [optional]
Form Card (main content)
  - Section headers with icons
  - Form fields in grid
  - Validation feedback
  - Submit button
Success State (centered)
```

**Form Style:**
- Label: `text-sm font-medium`
- Input: `rounded-lg` with focus ring `ring-primary`
- Section divider: `border-t pt-6 mt-6`
- Submit button: `w-full h-11`

### 3. Detail Pages (view student, view branch, etc.)
**Layout Pattern:**
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

## Component Rules

### PageHeader (use on ALL pages)
```tsx
<PageHeader
  title="Branches"
  description="Manage school branches"
  actions={<Button><Plus /> New</Button>}
/>
```

### Card (use shadow consistently)
```tsx
<Card shadow="default" className="rounded-xl">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

### Loading State
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
```

### Empty State (use EmptyState component)
```tsx
<EmptyState
  icon={<GitBranch />}
  title="No branches found"
  description="Create your first branch"
  action={{ label: "Create", onClick: () => router.push("/new") }}
/>
```

## Typography

| Element | Style |
|---------|-------|
| Page title | `text-3xl font-bold tracking-tight` |
| Card title | `text-lg font-semibold` |
| Table header | `text-xs font-medium uppercase tracking-wider` |
| Body text | `text-sm text-muted-foreground` |

## Accessibility

- Table: `aria-label`, `scope="col"` on headers
- Forms: `label` with `htmlFor`, `aria-invalid`
- Buttons: `aria-label` on icon-only buttons
- Focus: visible `ring-2 ring-primary` on all interactive elements
