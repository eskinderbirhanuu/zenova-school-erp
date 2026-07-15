# File Reviewed

`backend/app/core/pagination.py` (22 lines)

## Overview

Pagination utility: `paginate()` applies page/page_size to a SQLAlchemy Query and returns items + metadata. `build_paginated_response()` creates the response schema object.

## Issues

### Issue 1 — `query.count()` Executes an Extra SQL Query on Every Paginated Request

- **Line:** 9
- **Severity:** Medium
- **Category:** Performance
- **Description:** `total = query.count()` triggers a `SELECT COUNT(*)` query before the main query runs.
- **Why it is a problem:** Every paginated request executes TWO SQL queries (count + data). For tables with millions of rows, the count query can be slow.
- **Potential Impact:** Slow paginated responses on large tables (students, payments, audit logs).
- **Recommended Fix:** Use PostgreSQL `EXPLAIN`-based estimation for large tables, or use keyset pagination (cursor-based) instead of offset-based for large datasets.

### Issue 2 — No Maximum Page Size Protection by Default

- **Line:** 7
- **Severity:** Medium
- **Category:** Security
- **Description:** `max_page_size=200` is a hard default, but callers must explicitly pass it. Default `page_size=50` is reasonable.
- **Why it is a problem:** An attacker could request `?page_size=10000` and the function would return 10000 records per page (capped at 200). However, if a caller doesn't validate input before passing to `paginate`, the cap protects them.
- **Potential Impact:** Database/memory exhaustion if a caller bypasses the default max.
- **Recommended Fix:** Make `max_page_size` a configurable setting (e.g., `settings.max_page_size`) rather than a hardcoded value.

## Security Review

- Page size cap (200) prevents data exfiltration via pagination — good.
- Page number floor at 1 prevents negative page indexing — good.

## Performance Review

- Double query (COUNT + SELECT) is the standard SQLAlchemy pagination pattern. Acceptable for moderate table sizes (< 100K rows).
- Keyset pagination would be more performant for large tables.

## Maintainability

- Very clean, single-responsibility functions.
- Well-typed with clear parameter names.

## Architecture Review

- Pure utility function with no side effects — excellent separation of concerns.
- Paginated response schema imported from schemas module — good architectural layering.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 9/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 10/10 |
| Maintainability | 10/10 |
| Enterprise Readiness | 7/10 |
