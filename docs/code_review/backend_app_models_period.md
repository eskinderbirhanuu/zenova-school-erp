# File Reviewed

`backend/app/models/period.py` (19 lines)

## Model

- `AccountingPeriod` — name, `start_date`/`end_date`, `is_locked`, `locked_by`/`locked_at`.

## Issues

### Issue 1 — Clean Locking Model

- **Lines:** 7-19
- **Severity:** Good
- **Category:** Architecture
- **Description:** `is_locked` with `locked_by`/`locked_at` provides audit trail for period closure.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
