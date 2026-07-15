# File Reviewed

`backend/app/schemas/report_card.py` (33 lines)

## Schemas

- `SubjectGrade` (with `exams: list[dict]`), `ReportCardResponse`, `ReportCardDetail`.

## Issues

### Issue 1 — `SubjectGrade.exams` Uses `list[dict]`

- **Lines:** 11
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Exam data typed as `list[dict]` — no Pydantic validation on inner structure.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
