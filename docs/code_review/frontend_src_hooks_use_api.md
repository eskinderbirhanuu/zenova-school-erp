# File Reviewed

`frontend/src/hooks/use-api.ts` (46 lines)

## Hooks

- `useApiQuery(key, fetcher, options?)` — wrapper around `useQuery` with auto-extracted data.
- `useApiMutation<TVars>(mutator, options?)` — wrapper around `useMutation` with `invalidate` support.

## Issues

### Issue 1 — Clean Query Abstraction

- **Lines:** 4-46
- **Severity:** Good
- **Category:** Architecture
- **Description:** Simplifies React Query usage with automatic query key invalidation on mutation success.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
