# ADR-003: Frontend Data Fetching with React Query

**Status:** Accepted · **Date:** 2026-07-13

## Context

The frontend used `useState`+`useEffect` for all API calls — no caching, no deduplication, no stale-while-revalidate. Every page mount triggered a new request, and mutations required manual `fetchXxx()` calls to refresh data.

## Decision

Adopt `@tanstack/react-query` v5 with custom `useApiQuery`/`useApiMutation` hooks. All 174 data-fetching page components converted. React Query handles caching, dedup, background refetch, and provides `refetch()` for invalidation.

## Consequences

- Reduced API calls: deduplication prevents parallel requests for the same data
- Stale-while-revalidate: users see cached data while refetch happens in background
- Mutation invalidation: `invalidate` option auto-refreshes related queries after mutations
- ~438 pre-existing `implicit any` tsc errors remain (not introduced by conversion)
