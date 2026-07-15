# File Reviewed

`backend/app/models/employee_card.py` (19 lines)

## Model

- `EmployeeCard` — `employee_id` FK, `card_uid` (unique), `card_tier`, `status`, `issue_date`/`expiry_date`.

## Issues

### Issue 1 — `card_uid` Unique Index

- **Lines:** 13
- **Severity:** Good
- **Category:** Security
- **Description:** Unique card UID prevents duplicate card assignment.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
