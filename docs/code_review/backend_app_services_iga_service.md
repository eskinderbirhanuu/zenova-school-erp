# File Reviewed

`backend/app/services/iga_service.py` (101 lines)

## Overview

IGA (Inter-Governmental/Agency?) summary service — provides super-admin dashboard with totals for schools, licenses, servers, revenue, users, students, teachers, staff, parents, branches, audit events, and 12-month revenue trend.

## Issues

### Issue 1 — Revenue Includes All Payments, Not Just Completed

- **Lines:** 32-35
- **Severity:** Medium
- **Category:** Accuracy
- **Description:** `total_revenue` and `revenue_30d` include all payments regardless of status (pending, failed, refunded).
- **Why it is a problem:** Dashboard shows inflated revenue figures.
- **Potential Impact:** Incorrect financial reporting.

### Issue 2 — Teacher/Staff Count Includes Deleted Records

- **Lines:** 43-44
- **Severity:** Low
- **Category:** Consistency
- **Description:** `TeacherProfile` and `StaffProfile` counts don't filter `deleted_at=None`, unlike Student and School counts.
- **Why it is a problem:** Inconsistent counting — some counts exclude deleted, others include them.

### Issue 3 — `get_iga_summary` Returns No Pagination for Audit Logs

- **Lines:** 52
- **Severity:** Low
- **Category:** Performance
- **Description:** Latest 20 audit logs are returned inline. This is fine for the summary.

## Security Review

- No user input — purely aggregate queries.

## Performance Review

- Multiple aggregate queries (10+ separate `COUNT`/`SUM` queries) on large tables could be slow.
- Acceptable for a dashboard summary.

## Maintainability

- Well-structured with clear response sections.
- Consistent use of `func.coalesce` for null-safe sums.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readability | 7/10 |
