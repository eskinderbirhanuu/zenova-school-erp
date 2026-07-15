# File Reviewed

`backend/app/models/library_member.py` (19 lines)

## Model

- `LibraryMember` — `user_id` FK, name, email, `member_since`, `books_borrowed` (counter), `status`.

## Issues

### Issue 1 — `books_borrowed` Is a Denormalized Counter

- **Lines:** 16
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** Counter that can drift from actual borrowing count.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
