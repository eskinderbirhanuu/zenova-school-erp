# File Reviewed

`backend/app/services/academic_service.py` (477 lines)

## Overview

Academic management service — CRUD for academic years, semesters, class grades, sections, subjects, classrooms, timetables, exam types, exams, exam results, and student promotions with bulk support.

## Issues

### Issue 1 — No Input Validation on Number Fields

- **Lines:** 23-29, 43-49, 62-68, 101-107, 140-146, 181-187, 314-320, 330-341, 373-379
- **Severity:** Medium
- **Category:** Security
- **Description:** No validation that numeric fields (capacity, max_score, score, weight) are non-negative. The `data` parameter is untyped (`data` passed directly without Pydantic validation in this layer).
- **Why it is a problem:** Negative scores or capacities could be stored, causing display and logic errors downstream.
- **Potential Impact:** Data integrity issue — negative max_score or capacity in reports.

### Issue 2 — `set_current_academic_year` Bulk Update Design Flaw

- **Lines:** 32-40
- **Severity:** Medium
- **Category:** Reliability
- **Description:** The function does `update({"is_current": False})` on all years for the school before setting the new current year. If the commit fails after the update but before setting the new year, no year is current.
- **Why it is a problem:** Partial state on failure — losing the current year pointer.
- **Potential Impact:** Dashboard queries depend on `is_current`; they'd return no data during failure window.
- **Recommended Fix:** Use a single atomic UPDATE or a transaction with proper rollback handling.

### Issue 3 — `create_timetable_entry` Creates Entry Even With Conflicts

- **Lines:** 247-266
- **Severity:** Low
- **Category:** Functionality
- **Description:** `check_timetable_conflicts` is called but the return value (`conflicts`) is **never checked**. The entry is always created regardless of conflicts.
- **Why it is a problem:** The conflict detection runs but is effectively dead code — the entry is still created.
- **Potential Impact:** Double-booked classrooms and teacher time slots.
- **Recommended Fix:** If `conflicts` is non-empty, raise an HTTPException with the conflict details.

### Issue 4 — `promote_student` No Validation on `to_class_id`

- **Lines:** 440-453
- **Severity:** Medium
- **Category:** Validation
- **Description:** No check that `to_class_id` belongs to the same school or is a valid class grade.
- **Why it is a problem:** A student could be promoted to a non-existent or cross-school class.
- **Potential Impact:** Data integrity issue — student linked to invalid class.

### Issue 5 — `bulk_promote_students` Silently Skips Missing Students

- **Lines:** 460-477
- **Severity:** Low
- **Category:** Error Handling
- **Description:** Uses `continue` to skip students not found or with no current class. No indication is returned to the caller.
- **Why it is a problem:** Caller thinks 10 students were promoted, but some were silently skipped.
- **Potential Impact:** Admin is misled about promotion success.

## Security Review

- All functions filter by `school_id` — good tenant isolation.
- No SQL injection vectors — all ORM queries.
- No input sanitization beyond ORM parameterization.

## Performance Review

- `bulk_create_exam_results` iterates over parent-student links individually — may be slow for large classes. N+1 query pattern.
- `get_trends` in analytics does individual row-by-row mapping — acceptable for monthly aggregate.

## Maintainability

- Highly repetitive CRUD patterns (nearly identical create/update/delete for 10+ entity types). Could use generic CRUD base class.
- The `include_deleted` pattern is consistent but adds noise to every query.

## Architecture Review

- Academic service correctly separates concerns from models and endpoints.
- Timetable conflict detection is a strong feature, but the result is never enforced.
- Cross-file import inside `bulk_create_exam_results` (line 395-398) is a code smell — should be at top of file.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
