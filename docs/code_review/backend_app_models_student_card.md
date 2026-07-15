# File Reviewed

`backend/app/models/student_card.py` (19 lines)

## Model

- `StudentCard` — `student_id`, `card_uid` (unique), `card_tier`, `status`, `issue_date`/`expiry_date`.

## Issues

### Issue 1 — Standard Card Model Pattern

- **Lines:** 7-19
- **Severity:** Good
- **Category:** Architecture
- **Description:** Same pattern as `StaffCard` and `ParentCard`. Consistent across entity types.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
