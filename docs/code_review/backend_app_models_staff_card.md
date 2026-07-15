# File Reviewed

`backend/app/models/staff_card.py` (19 lines)

## Model

- `StaffCard` — `staff_profile_id`, `card_uid` (unique), `card_tier`, `status`, `issue_date`/`expiry_date`.

## Issues

### Issue 1 — Standard Card Model Pattern

- **Lines:** 7-19
- **Severity:** Good
- **Category:** Architecture
- **Description:** Consistent with `StudentCard` and `ParentCard` patterns. Unique `card_uid` with tier/status tracking.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
