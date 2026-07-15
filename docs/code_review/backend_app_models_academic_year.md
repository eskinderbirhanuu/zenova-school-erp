# File Reviewed

`backend/app/models/academic_year.py` (30 lines)

## Models

- `AcademicYear` — name, start/end dates, `is_current` flag, `school_id` FK.
- `Semester` — name, `academic_year_id` FK, `school_id` FK, start/end dates.

## Issues

### Issue 1 — `is_current` Is a Simple Boolean Without Trigger

- **Lines:** 14
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Nothing prevents multiple academic years from being `is_current=True`. Should be enforced at DB or service layer.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
