# File Reviewed

`frontend/src/types/global.d.ts` (7 lines)

## Declaration

- Declares module `*.tsx` as `any` to suppress implicit-any errors during incremental migration.

## Issues

### Issue 1 — Suppresses All TSX Module Type Checking

- **Lines:** 4-6
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Disables type checking for TSX imports. Should be removed as pages are typed.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
