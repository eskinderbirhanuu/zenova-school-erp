# File Reviewed

`backend/app/models/communication.py` (50 lines)

## Models

- `Announcement` — title, message, `target_roles` (CSV), `priority`.
- `Notification` — per-user, `reference_type`/`reference_id` for linking, `is_read`/`read_at`.
- `Message` — sender/recipient, subject, `is_read`/`read_at`.

## Issues

### Issue 1 — `Announcement` Model Also Exists in `announcement.py`

- **Lines:** 7-18
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `Announcement` class is defined in both `communication.py` and `announcement.py`. They have different table names (`announcements` vs `school_announcements`) and slightly different fields. This duplication is confusing.

### Issue 2 — `target_roles` CSV String

- **Lines:** 13
- **Severity:** Low
- **Category:** Architecture
- **Description:** Same pattern as `announcement.py`. CSV string instead of JSON/relationship.

### Issue 3 — `reference_id` Without FK in Notification

- **Lines:** 31
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Polymorphic reference — no FK constraint.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Readability | 7/10 |
| Maintainability | 7/10 |
