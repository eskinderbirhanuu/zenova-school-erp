# File Reviewed

`backend/app/services/analytics_service.py` (156 lines)

## Overview

Analytics service — provides dashboard overview totals, grade distribution by gender, staff distribution, 12-month trends (revenue, enrollment, attendance), and today's attendance summary.

## Issues

### Issue 1 — `get_grade_distribution` Assumes All Students Have a Grade

- **Lines:** 64-75
- **Severity:** Medium
- **Category:** Logic
- **Description:** Uses `outerjoin` to Student, but filters by `ClassGrade.school_id == school_id` and `Student.school_id == school_id`. Students without a `grade_id` (null) are excluded by the join condition.
- **Why it is a problem:** Students without a grade assignment are invisible in the distribution.
- **Potential Impact:** Incomplete grade distribution chart.

### Issue 2 — `get_overview_totals` Revenue Query Has No Date/Status Filter

- **Lines:** 44-45
- **Severity:** Medium
- **Category:** Functionality
- **Description:** Revenue sum includes all payments without any time range or status filter.
- **Why it is a problem:** Including failed/refunded payments inflates reported revenue.
- **Potential Impact:** Dashboard shows inflated revenue numbers.
- **Recommended Fix:** Filter by `Payment.status == 'completed'` (or equivalent).

### Issue 3 — `get_overview_totals` `_count` Method Uses `deleted_at=None` for Some Models

- **Lines:** 22-26
- **Severity:** Low
- **Category:** Consistency
- **Description:** Only Student, Branch explicitly filter `deleted_at=None`. Teacher, Staff, Parent do not.
- **Why it is a problem:** Soft-deleted teachers/staff/parents are counted — inconsistency.

### Issue 4 — Attendance Query in `get_trends` Uses `Attendance.created_at` Not `date`

- **Lines:** 112-120
- **Severity:** Low
- **Category:** Accuracy
- **Description:** `extract("month", Attendance.created_at)` extracts month from datetime. If attendance records span years, same month across different years is grouped.
- **Why it is a problem:** Year grouping mitigates this (line 117-118 include year extraction), so this is minor.

## Security Review

- No user input in any query beyond `school_id` filtering — safe.
- No sensitive data exposure.

## Performance Review

- Four separate aggregate queries for revenue, enrollment, attendance, and existing totals — could be merged for performance on large datasets.
- No pagination or limits — fine for aggregates.

## Maintainability

- Clean, well-organized service with clear responsibilities.
- The `_count` helper is a good abstraction but inconsistent model handling.

## Architecture Review

- Good separation from endpoint layer.
- Missing status filters on financial queries is the main concern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
