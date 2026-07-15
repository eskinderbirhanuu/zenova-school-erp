# File Reviewed

`backend/app/models/staff_profile.py` (21 lines)

## Model

- `StaffProfile` — `user_id` (unique), `staff_id` (unique), `department`, `employment_date`.
- Has `user = relationship("User")`.

## Issues

### Issue 1 — Clean Staff Profile Model

- **Lines:** 7-21
- **Severity:** Good
- **Category:** Architecture
- **Description:** Unique `user_id` ensures one profile per user. Separate `staff_id` for employee numbering.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
