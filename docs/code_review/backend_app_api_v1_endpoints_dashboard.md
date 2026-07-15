# File Reviewed

`backend/app/api/v1/endpoints/dashboard.py` (265 lines)

## Overview

Dashboard endpoints — overview (cached, 60s TTL), trends (12-month revenue, school growth, enrollment), analytics (grade distribution, staff distribution, attendance summary, trends).

## Issues

### Issue 1 — `_compute_dashboard_overview` Has Heavy Duplication

- **Lines:** 45-94
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** The super-admin and school-admin branches duplicate almost identical queries, differing only by `school_id` filter. ~50 lines of repeated logic.

### Issue 2 — `recent_activity` Limit Is Hardcoded

- **Lines:** 58, 89-91
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Limit fixed at 10. Should be configurable.

### Issue 3 — `dashboard_trends` Runs 3+ Aggregate Queries

- **Lines:** 176-203
- **Severity:** Medium
- **Category:** Performance
- **Description:** Three separate GROUP BY queries for school growth, revenue, and enrollment. For large datasets with millions of records, these queries could be slow. Consider materialized views or periodic aggregation.

### Issue 4 — Grade/Staff/Attendance/Analytics Endpoints Have No Permission Check

- **Lines:** 235-265
- **Severity:** Medium
- **Category:** Security
- **Description:** `/analytics/grade-distribution`, `/staff-distribution`, `/attendance-summary`, `/trends` only require `get_current_user`, not any specific permission. Any authenticated user can access analytics data.

### Issue 5 — Overview Cached at 60s but Trend Data Is Re-Computed Per Request

- **Lines:** 159-232
- **Severity:** Low
- **Category:** Performance
- **Description:** Trend endpoints have no caching. For repeated requests, the same heavy aggregate queries run every time.

### Issue 6 — Alert Severity Levels Are Not Documented in Schema

- **Lines:** 106-120
- **Severity:** Low
- **Category:** Documentation
- **Description:** Severity values `destructive`, `warning`, `info` are used without a schema or enum definition.

## Security Review

- Dashboard overview has no explicit permission check (relies on tenant scoping).
- Analytics endpoints have no permission check (Issue 4).
- Super-admin vs school scoping is correct.

## Performance Review

- Overview is cached (good).
- Trends runs 3 aggregate queries uncached (concern for large deployments).
- Consider data warehouse or pre-aggregated tables.

## Maintainability

- High duplication between super-admin and school-admin paths.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 6/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 5/10 |
