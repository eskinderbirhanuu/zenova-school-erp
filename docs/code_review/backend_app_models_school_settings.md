# File Reviewed

`backend/app/models/school_settings.py` (15 lines)

## Model

- `SchoolSettings` — `school_id` (unique), `settings_json` (Text).

## Issues

### Issue 1 — Schema-Less JSON Blob

- **Lines:** 12
- **Severity:** Medium
- **Category:** Architecture
- **Description:** All settings stored in a single JSON text column. No type safety, no migration tracking. Consider a key-value table or type-safe columns.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
