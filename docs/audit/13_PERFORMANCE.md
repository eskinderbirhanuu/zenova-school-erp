# 13 — PERFORMANCE AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

ZENOVA performance characteristics are assessed based on code patterns, database configuration, and architecture. The platform uses Redis for caching (rate limits, token blacklists, brute-force), PostgreSQL with connection pooling, composite indexes for common queries, lazy-loaded Next.js route segments, and APScheduler for background jobs. The main performance gaps are the absence of a server-state caching layer on the frontend (leading to redundant API requests), some list endpoints returning all results without pagination, and N+1 query risk in certain relationship-heavy endpoints.

**Score:** 6.5/10

---

## Current Implementation

### Database Performance

**Connection Pooling**:
- `pool_size=10`, `max_overflow=20` (configurable)
- `pool_pre_ping=True` (validates connections before use)
- `pool_recycle=1800` (recycles connections after 30 min)

**Indexes**:
- Standard indexes on all UUID PKs
- Unique auto-indexes on `unique=True` columns
- Composite indexes from `af43149492e0`:
  - attendance: (student_id, date)
  - payments: (school_id, payment_date)
  - invoices: (school_id, status)
  - audit_logs: (table_name, record_id)
  - sync_queue: (status, priority)
  - students: (school_id, status)
  - wallet: (school_id, student_id)

**Query Performance**:
- `with_for_update()` row locking for atomic operations
- `db.flush()` before commits in critical paths (sequence generation)
- Soft-delete filter at ORM level (adds `WHERE deleted_at IS NULL` to all queries)

**Identified N+1 Query Risks**:
- Finance list endpoints: query journal_entries → iterate → get lines → possible N+1 if not eager loaded
- Parent payments: get_parent_children → get invoices for each child → possible N+1
- NFC scan logs: list scan_logs → no eager loading for related entities
- Teacher profile endpoints: profile → assignments → grades → classes — deep relationships without eager loading

### API Performance

**Rate Limiting**: Redis-backed, prevents abuse
- API default: 200 req/60s per IP
- Login: 5 req/300s per IP
- Auth: 10 req/60s per IP

**Pagination**: Available on SOME list endpoints (skip/limit), missing on others (accounts, fee types)
**No API response caching**: Every request hits database directly
**Sync worker**: Background thread (30s poll → 300s backoff on error)

### Frontend Performance

**Code splitting**: Next.js App Router automatically splits by route segment (each `(role)` group)
**Lazy loading**: Route-level splitting, no component-level `dynamic()` imports
**No data caching**: No React Query/SWR. Every page navigation re-fetches data.
**Bundle**: No bundle analyzer. `three` + `@react-three` dependencies potentially unused (~500KB)
**Images**: No evidence of `next/image` optimization being used everywhere

### Redis Usage

Used for:
- Rate limit counters (sliding window)
- Brute-force counters (IP + identifier)
- Token blacklist (jti-based)
- Refresh token family (rtf:user_id)
- Session markers (session:user_id)
- License cache (get_cached_license_status)

**NOT used for**:
- API response caching
- Database query result caching
- Session data (stateless JWT)

### Background Jobs (APScheduler)

Cron-triggered jobs:
- Nightly archive (03:00)
- Nightly backup (04:00)
- Heartbeat check (every 6 hours)
- Audit zombie cleanup (weekly)
- License deactivation (on startup)
- Platform invoice generation (monthly)
- TPM refresh (weekly)
- Grace period enforcement (daily)
- Telegram bot polling (30 sec)

---

## Strengths

1. **Connection pooling**: Configurable pool with pre-ping and recycling — robust.
2. **Composite indexes**: Targeted indexes on common query patterns.
3. **with_for_update() locking**: Race-safe for critical operations.
4. **Redis for hot-path data**: Rate limits, brute-force, token blacklists — reduces DB load.
5. **Code splitting via App Router**: Automatic per-route chunking — good for initial load.
6. **Background jobs via APScheduler**: Nightly maintenance jobs offloaded from request path.
7. **Separate sync worker container (VPS)**: Sync processing doesn't compete with API requests.

---

## Weaknesses

1. **No frontend data caching layer**: Every page load re-fetches data from API. Redundant network requests, slower perceived UX, no optimistic updates, no cache invalidation pattern. This is the #1 performance gap.
2. **Unpaginated list endpoints**: `list_accounts()`, `list_fee_types()`, `list_backups()` return ALL results — could be thousands of rows.
3. **No API response caching**: Repeated identical queries (e.g., dashboard metrics) hit DB every time.
4. **N+1 query risk**: Several service methods iterate over results and perform sub-queries without eager loading. No `joinedload()` or `selectinload()` observed in sampled code.
5. **No query profiling/monitoring**: No slow-query logging, no DB query metrics.
6. **Single sync worker thread**: One thread processes all sync entries. Could become bottleneck at scale.
7. **WASM compiler fallback**: Next.js SWC binary not compatible → falls back to WASM. Slower builds and HMR.
8. **No CDN or static asset optimization**: All assets served from same Next.js server.
9. **No database read replicas**: All queries hit primary PostgreSQL instance.
10. **No edge caching**: No Varnish/Cloudflare/etc. for API responses.

---

## Issues

### High

| # | Issue | Detail |
|---|-------|--------|
| H1 | No frontend data caching | Every page navigation = fresh API calls. Redundant load, slow UX |
| H2 | Unpaginated list endpoints | Some endpoints return all rows. Could return thousands of records |

### Medium

| # | Issue | Detail |
|---|-------|--------|
| M1 | N+1 query risk | No eager loading observed. Relationship-heavy endpoints likely issue N queries per result |
| M2 | No API response caching | Dashboard queries, fee lists, etc. re-executed on every request |
| M3 | Single sync worker thread | Sync backlog growth at scale |
| M4 | WASM fallback slower builds | SWC binary incompatible — slower development loop |
| M5 | `three` + `@react-three` possibly unused | ~500KB dead weight in frontend bundle |

### Low

| # | Issue | Detail |
|---|-------|--------|
| L1 | No query profiling | Slow queries not identified |
| L2 | No CDN for static assets | All assets from Next.js server |
| L3 | No read replicas | No query offloading |
| L4 | No request ID propagation in logs | Hard to trace slow requests end-to-end |
| L5 | Sync worker 300s backoff | Long retry interval after error — queue can stall |

---

## Recommended Improvements

1. **HIGH: Add React Query (TanStack Query)** — For frontend data caching, deduplication, background refetch, optimistic updates. Most impactful single change for UX. Medium effort.
2. **HIGH: Add pagination to all list endpoints** — Standardize `skip`/`limit` with `PaginatedResponse` wrapper. Medium effort.
3. **MEDIUM: Add eager loading** — Use `joinedload()` or `selectinload()` in deep-relationship queries. Audit N+1 hotspots. Medium effort.
4. **MEDIUM: Add Redis API caching** — Cache frequent read queries (dashboard, fee lists) with 5-10 minute TTL. Low effort.
5. **MEDIUM: Add slow-query logging** — PostgreSQL `log_min_duration_statement` or SQLAlchemy event listener. Low effort.
6. **LOW: Enable concurrent sync workers** — Multiple worker threads or processes. Medium effort.
7. **LOW: Remove unused three.js dependencies** — If unused, ~500KB savings. Low effort.
8. **LOW: CDN for static assets** — Cloudflare or nginx proxy cache. Low effort.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| React Query | Medium | Low — additive |
| Pagination standardization | Medium | Low |
| Eager loading | Low per-query | Low |
| Redis caching | Low | Low |
| Concurrent sync workers | Medium | Medium |

---

## Priority

| Priority | Item |
|----------|------|
| P1 (soon) | React Query for frontend caching |
| P1 (soon) | Pagination on all list endpoints |
| P2 (later) | Eager loading audit + fix |
| P2 (later) | Redis API response caching |
| P3 (nice-to-have) | Slow-query logging, CDN, concurrent sync |

---

## Production Readiness: Performance

**Ready for small-scale pilot.** For a single school server with <2000 students, current performance is adequate. The lack of frontend caching and unpaginated endpoints will degrade UX as data grows. Should be addressed before multi-school or large-school deployment.