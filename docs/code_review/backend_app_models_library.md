# File Reviewed

`backend/app/models/library.py` (50 lines)

## Models

- `BookCategory` — name, `school_id`.
- `Book` — `isbn`, title, `author`, `publisher`, `year`, `category_id`, `total_quantity`/`available_quantity`, `shelf_location`.
- `BookBorrowing` — `book_id`, `borrower_type`/`borrower_id` (polymorphic), `borrow_date`/`due_date`/`return_date`, `status`, `fine_amount`.

## Issues

### Issue 1 — `available_quantity` Must Be Manually Updated

- **Lines:** 28
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `available_quantity` is a denormalized counter that must be decremented/incremented on each borrow/return. Risk of drifting from actual state.

### Issue 2 — Polymorphic `borrower_id` Without FK

- **Lines:** 41
- **Severity:** Low
- **Category:** Data Integrity
- **Description:** `borrower_id` string without FK — no referential integrity.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
