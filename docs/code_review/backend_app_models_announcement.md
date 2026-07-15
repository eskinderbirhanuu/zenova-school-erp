# File Reviewed

`backend/app/models/announcement.py` (19 lines)

## Model

- `Announcement` — title, content, `target_roles` (comma-separated string), `is_published`, `school_id` FK, `created_by` FK, soft-delete.

## Issues

### Issue 1 — `target_roles` Is a CSV String

- **Lines:** 13
- **Severity:** Low
- **Category:** Architecture
- **Description:** Role targeting uses a comma-separated string rather than a JSON array or a many-to-many relationship. Simple for the current use case.

### Issue 2 — `updated_at` Uses `onupdate` Without Guard

- **Lines:** 18
- **Severity:** Low
- **Category:** Reliability
- **Description:** `onupdate` fires on every ORM update. Acceptable.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
