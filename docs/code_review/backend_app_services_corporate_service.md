# File Reviewed

`backend/app/services/corporate_service.py` (212 lines)

## Overview

Corporate management service — CRUD for departments and employees with auto-generated employee IDs (sequential `ZNV-EMP-XXXXXX`), dashboard stats, and audit logging.

## Issues

### Issue 1 — `_generate_employee_id` Has Race Condition

- **Lines:** 204-212
- **Severity:** Medium
- **Category:** Concurrency
- **Description:** Reads `MAX(employee_id)` and increments it — two concurrent requests could get the same ID.
- **Why it is a problem:** Duplicate `employee_id` values in the database.
- **Potential Impact:** Employee ID collision.
- **Recommended Fix:** Use a database sequence, or catch unique constraint violation and retry.

### Issue 2 — `create_employee` No Email/Phone Format Validation

- **Lines:** 67-104
- **Severity:** Medium
- **Category:** Validation
- **Description:** Email and phone are accepted as-is with no format validation.
- **Why it is a problem:** Invalid emails in the system cause email delivery failures.

### Issue 3 — `update_department` and `update_employee` Accept Arbitrary Dict Keys

- **Lines:** 34-57, 107-130
- **Severity:** Low
- **Category:** Security
- **Description:** Uses `for key, val in data.items()` with `hasattr` to set any attribute. A caller could pass unexpected keys.
- **Why it is a problem:** Potentially sets internal or computed attributes.
- **Recommended Fix:** Use a whitelist of updatable fields.

## Security Review

- No school_id scoping — corporate model appears to be system-wide (not per-school).
- Audit logging on all mutations.

## Performance Review

- Simple CRUD — no performance concerns.

## Maintainability

- Clean, well-structured with clear separation of concerns.
- Generic update pattern reduces boilerplate.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
