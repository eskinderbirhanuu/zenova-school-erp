# File Reviewed

`backend/app/schemas/settings.py` (33 lines)

## Schemas

- `SchoolSettingsPayload` with `extra = "forbid"`, `SchoolSettingsUpdate`.

## Issues

### Issue 1 — All Fields Are `str` Instead of Typed

- **Lines:** 8-30
- **Severity:** Medium
- **Category:** Type Safety
- **Description:** All settings fields are `Optional[str]` — booleans like `enable_email_notifications` and integers like `session_timeout`, `max_login_attempts` are stored as strings.

### Issue 2 — Good `extra = "forbid"`

- **Lines:** 6
- **Severity:** Good
- **Category:** Security
- **Description:** Prevents injection of unexpected settings keys.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 5/10 |
| Security | 7/10 |
| Readability | 7/10 |
| Maintainability | 6/10 |
