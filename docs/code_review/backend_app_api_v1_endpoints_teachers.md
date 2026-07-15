# File Reviewed

`backend/app/api/v1/endpoints/teachers.py` (333 lines)

## Overview

Teacher management — create (with user account + profile), update, list, assign grade/section/subjects, QR/NFC generation, self-service profile/subjects/students endpoints.

## Issues

### Issue 1 — Default Password "changeme123" Hardcoded

- **Lines:** 27
- **Severity:** Low
- **Category:** Security
- **Description:** Same issue as `staff.py`. Default password is hardcoded.

### Issue 2 — Indentation Inconsistency on Lines 42-43

- **Lines:** 42-43
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `school_id=school_id` and `branch_id=branch_id` use 16 spaces while surrounding code uses 12. Works in Python but inconsistent.

### Issue 3 — `update_teacher` Has No Permission Check

- **Lines:** 65-101
- **Severity:** Medium
- **Category:** Security
- **Description:** Only `get_current_user` is required — any authenticated user can update any teacher's profile. The docstring says "Update own teacher profile (TEACHER) or any teacher (DIRECTOR/ADMIN)" but there's no actual authorization logic.

### Issue 4 — `assign_teacher_subjects` Uses Set for Existing Subjects

- **Lines:** 189
- **Severity:** Good
- **Category:** Performance
- **Description:** Uses a set to check existing subjects before adding, avoiding duplicate inserts.

### Issue 5 — `get_my_students` Grade Map Is Constructed with `grades.get(s.grade_id, s.grade_id or "")`

- **Lines:** 329
- **Severity:** Low
- **Category:** Code Quality
- **Description:** Falls back to raw `grade_id` if grade name not found. Acceptable.

### Issue 6 — No Pagination on List Endpoints

- **Lines:** 104-110, 273-289, 292-333
- **Severity:** Low
- **Category:** Performance
- **Description:** Teacher list, subjects, and students have no pagination.

## Security Review

- TEACHER_CREATE for creation.
- `update_teacher` lacks permission check (Issue 3).
- `get_my_*` endpoints are self-service.

## Performance Review

- `get_my_students` uses batch-loaded grade names.
- No pagination.

## Maintainability

- Moderate duplication of TeacherResponse construction.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 6/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
