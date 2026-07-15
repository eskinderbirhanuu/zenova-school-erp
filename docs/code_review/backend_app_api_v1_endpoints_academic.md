# File Reviewed

`backend/app/api/v1/endpoints/academic.py` (462 lines)

## Overview

Academic endpoints — full CRUD for academic years, semesters, classes, sections, subjects, classrooms, timetables, exam types, exams, exam results (single/bulk/import/export), promotions (single/bulk), assignments, and marksheet view.

## Issues

### Issue 1 — Repetitive `include_deleted` Guard Logic

- **Lines:** 42, 70, 87, 116, 145, 173, 213, 257, 286, 302
- **Severity:** Low
- **Category:** Code Quality
- **Description:** The `include_deleted` determination (`current_user.is_superuser or ... role.name in (...)`) is repeated 10+ times across the file.
- **Potential Impact:** Maintenance burden if role hierarchy changes.

### Issue 2 — Inline Query in `get_teacher_timetable` Bypasses Service Layer

- **Lines:** 218-230
- **Severity:** Low
- **Category:** Architecture
- **Description:** Direct DB query bypasses `academic_service` layer. Inconsistent with the rest of the file.

### Issue 3 — `check_conflicts` Computes But Doesn't Store Result

- **Lines:** 233-244
- **Severity:** Low
- **Category:** Design
- **Description:** Returned to caller but the caller must manually handle conflicts before calling create. The create endpoint itself doesn't check conflicts (see academic_service Issue 3).

### Issue 4 — `assignments` Endpoint Has `grade` Hardcoded to `None`

- **Lines:** 459
- **Severity:** Low
- **Category:** Incomplete
- **Description:** `"grade": None` in the response — grade data is missing.

## Security Review

- Permission decorators on all mutation endpoints (DIRECTOR_CREATE, DIRECTOR_ONLY).
- School_id scoping via `current_user.school_id`.
- Import/export endpoints gated behind permissions.

## Performance Review

- Marksheet view uses batch-loading for student names — good.
- No pagination on some list endpoints (e.g., list_exam_results).
- Export endpoint uses batch-loading pattern.

## Maintainability

- Well-structured with clear route organization.
- Repetitive include_deleted logic should be extracted to a helper.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 7/10 |
