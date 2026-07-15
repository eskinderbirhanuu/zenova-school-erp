# File Reviewed

`backend/app/models/report.py` (19 lines)

## Model

- `Report` — `name`, `report_type`, `module` (indexed), `period`, `status`.

## Issues

### Issue 1 — No File or Output Storage

- **Lines:** 7-19
- **Severity:** Note
- **Category:** Architecture
- **Description:** Report metadata only; actual generated output (PDF, CSV) is presumably stored externally.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
