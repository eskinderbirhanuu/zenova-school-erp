# File Reviewed

`frontend/src/components/ui/data-table.tsx` (303 lines)

## Component

- `DataTable<T>` — Generic data table with sortable columns, selection, expandable mobile rows, row click handling, Framer Motion animations.

## Issues

### Issue 1 — Good Generic Data Table

- **Lines:** 10-18
- **Severity:** Good
- **Category:** Architecture
- **Description:** Typed generic with `Column<T>` interface, sortable columns, selection, mobile responsive layout.

### Issue 2 — `any` Typed Column Loop

- **Lines:** 128, 197, 242
- **Severity:** Low
- **Category:** Type Safety
- **Description:** `columns.map((col: any)` — column type should be inferred from generic.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
