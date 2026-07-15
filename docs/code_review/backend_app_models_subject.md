# File Reviewed

`backend/app/models/subject.py` (17 lines)

## Model

- `Subject` — `school_id`, `name`, `code`, `class_id` FK, `is_optional`.

## Issues

### Issue 1 — No Unique Constraint on `code`

- **Lines:** 13
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Subject codes should be unique per school but no constraint enforces this.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
