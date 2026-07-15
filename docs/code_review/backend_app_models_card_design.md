# File Reviewed

`backend/app/models/card_design.py` (16 lines)

## Model

- `CardDesign` — one per school (unique), `logo_url`, `design_json` (Text for JSON blob).

## Issues

### Issue 1 — `school_id` Has Unique Constraint

- **Lines:** 11
- **Severity:** Good
- **Category:** Architecture
- **Description:** One design per school — enforced at DB level.

### Issue 2 — `design_json` Stored as Text

- **Lines:** 13
- **Severity:** Note
- **Category:** Architecture
- **Description:** JSON blob stored as text. Acceptable for UI design config.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 9/10 |
