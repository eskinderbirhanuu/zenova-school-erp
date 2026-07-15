# File Reviewed

`backend/app/models/report_card.py` (31 lines)

## Models

- `ReportCard` — `student_id`, `semester_id`, `academic_year_id`, `pdf_url`.
- `PromotionRecord` — `from_class_id`, `to_class_id`, `academic_year_id`, `promoted_by`.

## Issues

### Issue 1 — `PromotionRecord` Does Not Validate `from_class_id != to_class_id`

- **Lines:** 26-27
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** No constraint prevents promoting a student to the same class.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
