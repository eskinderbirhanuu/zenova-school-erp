# File Reviewed

`frontend/src/components/layout/sidebar.tsx` (81 lines)

## Component

- `Sidebar` — static sidebar with role-filtered navigation items and logout.

## Issues

### Issue 1 — Duplicate Navigation Logic

- **Lines:** 16-35, 37-81
- **Severity:** Medium
- **Category:** Maintainability
- **Description:** Hardcoded `navItems` array duplicates the role-based nav from `role-layout.tsx`. Both sidebars should share navigation config.

### Issue 2 — `any` in Filter

- **Lines:** 41
- **Severity:** Low
- **Category:** Type Safety
- **Description:** `item: any` in filter callback.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
