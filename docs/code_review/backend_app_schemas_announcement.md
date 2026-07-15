# File Reviewed

`backend/app/schemas/announcement.py` (27 lines)

## Schemas

- `AnnouncementCreate`, `AnnouncementUpdate`, `AnnouncementResponse` with `ConfigDict(from_attributes=True)`.

## Issues

### Issue 1 — Clean Pydantic v2 Style

- **Lines:** 1-27
- **Severity:** Good
- **Category:** Architecture
- **Description:** Uses `str | None` (PEP 604) syntax and `ConfigDict(from_attributes=True)` for ORM mode.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
