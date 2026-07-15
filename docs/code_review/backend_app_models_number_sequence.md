# File Reviewed

`backend/app/models/number_sequence.py` (20 lines)

## Model

- `NumberSequence` — `prefix`, `school_id`, `year`, `last_number`. Unique constraint on `(prefix, school_id, year)`.

## Issues

### Issue 1 — Composite Unique Constraint

- **Lines:** 18-20
- **Severity:** Good
- **Category:** Architecture
- **Description:** Prevents duplicate sequences for the same prefix/school/year — correct design for auto-numbering.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
