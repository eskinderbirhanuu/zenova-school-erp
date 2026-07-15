# File Reviewed

`backend/app/services/staff_service.py` (213 lines)

## Overview

Staff management service — creates staff (User + StaffProfile together), lists/filters by role, gets by ID/user_id, updates, and deactivates.

## Issues

### Issue 1 — `list_staff` Has N+1 Query for Role and Profile

- **Lines:** 91-120
- **Severity:** Medium
- **Category:** Performance
- **Description:** The main query joins User + StaffProfile, but the loop fetches role name and profile separately for each user. This is the classic N+1 pattern.
- **Potential Impact:** Slow staff listing for large schools.

### Issue 2 — `create_staff` Password Set but No Complexity Check

- **Lines:** 53-55
- **Severity:** Medium
- **Category:** Security
- **Description:** Password is accepted as-is with no minimum length or complexity requirements.
- **Why it is a problem:** Weak passwords can be set for staff accounts.
- **Potential Impact:** Easy brute-force on staff accounts.

### Issue 3 — `ROLE_MAP` Hardcoded Set of Valid Roles

- **Lines:** 11-19
- **Severity:** Low
- **Category:** Maintainability
- **Description:** Adding a new staff role requires code changes in `ROLE_MAP` and database seeding.

### Issue 4 — `deactivate_staff` Soft-Deactivates User but Not Profile

- **Lines:** 200-213
- **Severity:** Low
- **Category:** Consistency
- **Description:** User `is_active` is set to False, but `StaffProfile` has no similar flag.

## Security Review

- Email uniqueness enforced.
- Audit logging on all operations.

## Performance Review

- N+1 query in listing is the main concern.

## Maintainability

- Good separation of User and StaffProfile.
- Clean CRUD patterns.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 6/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
