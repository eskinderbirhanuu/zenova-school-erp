# File Reviewed

`frontend/src/components/ui/status-badge.tsx` (92 lines)

## Components

- `StatusBadge` — status badge with auto-mapped variant, icon, and SR labels.
- `MappedStatusBadge` — mapped variant helper for typed status values.

## Issues

### Issue 1 — Good Status Badge Pattern

- **Lines:** 24-33, 44-51, 53-73, 78-87, 89-91
- **Severity:** Good
- **Category:** Architecture
- **Description:** Auto-maps status strings to semantic variants and icons. Mapped variant helper for typed status values. Both cleanly composed.

### Issue 2 — Accessibility Good

- **Lines:** 66, 71
- **Severity:** Good
- **Category:** Accessibility
- **Description:** `role="status"`, `aria-label`, and `<span class="sr-only">` provide screen-reader context.

### Issue 3 — Unused `auto_approved` Variant

- **Lines:** 31
- **Severity:** Info
- **Category:** Maintainability
- **Description:** `auto_approved: "info"` is defined but not referenced in any status mapping or usage.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Accessibility | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
