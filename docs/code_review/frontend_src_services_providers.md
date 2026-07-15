# File Reviewed

`frontend/src/services/providers.tsx` (26 lines)

## Component

- `Providers` — wraps app with `QueryClientProvider` (30s stale time, 5min GC, 1 retry, no refetch on focus).

## Issues

### Issue 1 — Clean Provider Setup

- **Lines:** 6-26
- **Severity:** Good
- **Category:** Architecture
- **Description:** Standard React Query configuration with sensible defaults.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
