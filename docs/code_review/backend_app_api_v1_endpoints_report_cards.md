# File Reviewed

`backend/app/api/v1/endpoints/report_cards.py` (211 lines)

## Overview

Report card generation and retrieval — list with filters, generate (computes grade averages per subject, assigns letter grades), get by ID.

## Issues

### Issue 1 — `generate_report_card` Duplicates Logic from `get_report_card`

- **Lines:** 43-147 vs 150-211
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** The grade computation logic (exam queries, result mapping, subject grades computation) is nearly identical in both endpoints. ~80 lines of duplication. Should be extracted to a service function.

### Issue 2 — No Permission Check on List/Generate/Get Endpoints

- **Lines:** 20-26, 43-49, 150-155
- **Severity:** Medium
- **Category:** Security
- **Description:** All three endpoints only require `get_current_user`. No TEACHER_VIEW or STUDENT_VIEW permission. Any authenticated user can view/generate report cards.

### Issue 3 — `generate_report_card` Locks `with_for_update` on ExamResult Query

- **Lines:** 81-84
- **Severity:** Note
- **Category:** Concurrency
- **Description:** No explicit lock — acceptable for report generation which is expected to be idempotent.

### Issue 4 — `list_report_cards` Returns All Cards Without Pagination

- **Lines:** 20-41
- **Severity:** Low
- **Category:** Performance
- **Description:** No pagination on the list endpoint.

### Issue 5 — Grade Computation Uses `compute_grade` for Both Subject and Overall

- **Lines:** 111, 114
- **Severity:** Note
- **Category:** Design
- **Description:** `compute_subject_grades` is only used in `get_report_card` but not in `generate_report_card` — inconsistency.

## Security Review

- No permission checks (Issue 2).

## Performance Review

- Grade computation happens on every request (no caching).
- No pagination on list.

## Maintainability

- High duplication between generate and get for grade computation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 5/10 |
| Performance | 7/10 |
| Readability | 6/10 |
| Maintainability | 6/10 |
| Enterprise Readiness | 5/10 |
