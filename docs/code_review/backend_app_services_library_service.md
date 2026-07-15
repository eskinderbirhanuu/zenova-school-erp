# File Reviewed

`backend/app/services/library_service.py` (96 lines)

## Overview

Library management service — CRUD for book categories and books, borrowing/returning with available quantity tracking, and search by title/author.

## Issues

### Issue 1 — Borrow/Return Deduction Race Condition

- **Lines:** 59-71, 74-90
- **Severity:** Medium
- **Category:** Concurrency
- **Description:** `available_quantity -= 1` and `available_quantity += 1` are not protected by `with_for_update()`. Two concurrent requests could borrow the same last copy.
- **Why it is a problem:** Available quantity can go negative or become inconsistent.
- **Potential Impact:** Over-borrowing — more books borrowed than inventory allows.

### Issue 2 — SQL Injection via `ilike` With User Input

- **Lines:** 55
- **Severity:** Low
- **Category:** Security
- **Description:** `Book.title.ilike(f"%{search}%")` — SQLAlchemy's `ilike` parameterizes the value, so SQL injection is not possible. However, `%` in search terms could cause unintended pattern matching.
- **Why it is a note:** Parameterized query is safe; the `%` wrapping is intentional.

### Issue 3 — `update_book` Quantity Update Doesn't Adjust Available

- **Lines:** 36-49
- **Severity:** Medium
- **Category:** Logic
- **Description:** If `total_quantity` is updated (reduced), `available_quantity` is not recalculated. Available could exceed total.
- **Why it is a problem:** Available quantity can be greater than total quantity.

### Issue 4 — `get_borrowings` No Pagination

- **Lines:** 93-96
- **Severity:** Low
- **Category:** Performance
- **Description:** Returns all borrowings — could be large.

## Security Review

- School_id scoping mostly present.
- Search is parameterized — safe from injection.

## Performance Review

- Borrow/return operations are fast.
- No pagination on borrowings list.

## Maintainability

- Clean and simple.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 7/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
