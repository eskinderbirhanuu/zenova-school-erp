# File Reviewed

`backend/app/models/library_fine.py` (19 lines)

## Model

- `LibraryFine` — `borrowing_id` FK, `member_name`, `book_title`, `days_overdue`, `amount`, `status`.

## Issues

### Issue 1 — `member_name` and `book_title` Are Denormalized

- **Lines:** 13-14
- **Severity:** Low
- **Category:** Architecture
- **Description:** Denormalized for query convenience. Acceptable for fines that should remain readable even if the member/book are deleted.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
