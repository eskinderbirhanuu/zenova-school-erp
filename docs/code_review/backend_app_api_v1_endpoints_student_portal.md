# File Reviewed

`backend/app/api/v1/endpoints/student_portal.py` (138 lines)

## Overview

Student portal dashboard — attendance stats, recent exam results with batch subject loading, today's schedule with batch classroom loading, upcoming assignments, and wallet balance.

## Issues

### Issue 1 — `start_of_term` Is Hardcoded to January 1

- **Lines:** 30
- **Severity:** Low
- **Category:** Functionality
- **Description:** Attendance is counted from `today.replace(month=1, day=1)` regardless of the academic calendar. Should use the actual academic year start date.

### Issue 2 — Exam Results Limiting to First Subject Only

- **Lines:** 66-78
- **Severity:** Medium
- **Category:** Functionality
- **Description:** The `seen_subjects` set means only the first exam result for each subject is included. All subsequent exam results for the same subject are skipped. This means the dashboard only shows one score per subject, which may be misleading if multiple exams exist per subject.

### Issue 3 — Batch Loading Reduces N+1

- **Lines:** 57-58, 62-64, 92-97
- **Severity:** Good
- **Category:** Performance
- **Description:** Exam names, subject names, classrooms are batch-loaded.

### Issue 4 — Assignments Not Scoped to Student's School/Class

- **Lines:** 108-111
- **Severity:** Medium
- **Category:** Functionality
- **Description:** `Assignment.school_id == current_user.school_id` returns all school assignments, not just the student's class assignments. No section/grade filter.

### Issue 5 — No Permission Check

- **Lines:** 22-23
- **Severity:** Low
- **Category:** Security
- **Description:** Only `get_current_user` — portal is self-service for students.

## Security Review

- No explicit permission — acceptable for self-service student portal.

## Performance Review

- Batch loading of subjects/classrooms.

## Maintainability

- Dashboard logic is tightly coupled to response construction.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 6/10 |
