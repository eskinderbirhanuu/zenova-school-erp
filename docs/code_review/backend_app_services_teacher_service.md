# File Reviewed

`backend/app/services/teacher_service.py` (223 lines)

## Overview

Teacher management service — creates teacher (User + TeacherProfile), assigns/releases grade and section assignments, lists with profile fields, and updates.

## Issues

### Issue 1 — `list_teachers` Has N+1 Query

- **Lines:** 143-164
- **Severity:** Medium
- **Category:** Performance
- **Description:** Joins User + TeacherProfile but fetches profile separately in the loop. Same pattern as `staff_service.py`.
- **Potential Impact:** Slow teacher listing for large schools.

### Issue 2 — `update_teacher_profile` Uses `teacher_id` Not `profile_id`

- **Lines:** 167-219
- **Severity:** Low
- **Category:** Design
- **Description:** Uses `teacher_id` (the display ID like `TCH-2026-00001`) to find the profile, not the internal UUID. Display IDs can theoretically change.

### Issue 3 — No Password Complexity Check on Create

- **Lines:** 40-42
- **Severity:** Medium
- **Category:** Security
- **Description:** Password accepted as-is with no minimum length/complexity.

### Issue 4 — No Deactivate Teacher Function

- **Lines:** (missing)
- **Severity:** Low
- **Category:** Functionality
- **Description:** No function to deactivate a teacher (unlike `staff_service.deactivate_staff`).

## Security Review

- Email uniqueness enforced per school.
- Audit logging.

## Performance Review

- N+1 in listing.

## Maintainability

- Well-structured with separate grade/section assignment functions.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 6/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 6/10 |
