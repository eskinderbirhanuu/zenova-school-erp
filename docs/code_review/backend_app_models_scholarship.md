# File Reviewed

`backend/app/models/scholarship.py` (18 lines)

## Model

- `Scholarship` — `school_id`, `student_id`, `scholarship_type`, `value` (DECIMAL), `academic_year_id`, `approved_by`.

## Issues

### Issue 1 — No Unique Constraint on Student-Per-Year

- **Lines:** 7-18
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** A student could have multiple scholarships for the same academic year and type with no constraint preventing it.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
