# File Reviewed

`backend/app/models/exam.py` (46 lines)

## Models

- `ExamType` — name, `weight` (DECIMAL), `school_id`.
- `Exam` — name, `exam_type_id`, `subject_id`, `class_id`, `semester_id`, `exam_date`, `max_score`.
- `ExamResult` — `exam_id`, `student_id`, `score`, `grade`, `remarks`, `entered_by`.

## Issues

### Issue 1 — `weight` on ExamType Not Used in Computation

- **Lines:** 13
- **Severity:** Low
- **Category:** Architecture
- **Description:** `ExamType.weight` exists but the grading system in `report_cards.py` does not use it — all exams are averaged equally.

### Issue 2 — `grade` Column on ExamResult Is Denormalized

- **Lines:** 42
- **Severity:** Low
- **Category:** Architecture
- **Description:** Grade is stored directly on the result. Could be computed from score, but caching the grade avoids recomputation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
