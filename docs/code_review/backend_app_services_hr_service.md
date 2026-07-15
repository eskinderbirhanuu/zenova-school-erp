# File Reviewed

`backend/app/services/hr_service.py` (282 lines)

## Overview

HR service — employee contracts (create, terminate), leave types, leave requests with balance enforcement, attendance marking (single and bulk), and performance reviews.

## Issues

### Issue 1 — Leave Days Calculation Off by One

- **Lines:** 79
- **Severity:** Medium
- **Category:** Bug
- **Description:** `days = (data.end_date - data.start_date).days + 1` adds one to include both start and end dates. However, for same-day leave (start == end), `days` is 1, which is correct. For a start-end range, this is correct but depends on interpretation — some systems use exclusive end dates.
- **Why it is:** Potentially inconsistent with how other systems calculate leave days, but `.days + 1` is a common convention for inclusive date ranges.

### Issue 2 — Leave Balance Not Auto-Initialized

- **Lines:** 69-95
- **Severity:** Medium
- **Category:** Functionality
- **Description:** `request_leave` checks balance but doesn't auto-initialize a balance record if one doesn't exist. If `bal` is None, the balance check is skipped entirely — any amount of leave can be taken.
- **Why it is a problem:** Staff with no balance record can take unlimited leave.
- **Potential Impact:** Leave abuse by staff whose balance was never initialized.
- **Recommended Fix:** Create a default leave balance if none exists, or reject the request.

### Issue 3 — `approve_leave` Deducts From Balance After Approval, Not On Request

- **Lines:** 98-119
- **Severity:** Low
- **Category:** Logic
- **Description:** Leave balance is deducted on approval, not on request. This is the correct workflow (verify availability on request, deduct on approval), but between request and approval, another approval could consume the same balance.
- **Why it is a problem:** Race condition — two approvals could over-consume leave balance.

### Issue 4 — `bulk_mark_attendance` Uses `data.get()` on List of Dicts

- **Lines:** 197-226
- **Severity:** Low
- **Category:** Consistency
- **Description:** The function takes a list of dicts (`records`), not Pydantic models, while `mark_attendance` takes a Pydantic `data` object. Inconsistent API surface.

## Security Review

- School_id scoping on all queries.
- `include_deleted` option on leave/attendance queries could expose soft-deleted records.

## Performance Review

- Leave balance check is a simple query — acceptable.
- Bulk attendance marking is efficient.

## Maintainability

- Clean HR domain with good separation of features.
- Repeatable CRUD patterns throughout.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
