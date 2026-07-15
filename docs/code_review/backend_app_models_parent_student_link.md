# File Reviewed

`backend/app/models/parent_student_link.py` (19 lines)

## Overview

Many-to-many link table between Parent and Student with school context, relationship type, and primary parent designation.

## Issues

### Issue 1 — No `id` Column — Composite Primary Key Only

- **Lines:** 10-11
- **Severity:** Low
- **Category:** Architecture
- **Description:** Uses `(parent_id, student_id)` composite primary key instead of a surrogate UUID key.
- **Why it is a problem:** While composite keys are valid, they make it harder for external systems to reference a specific link record.
- **Potential Impact:** API design needs two IDs to reference a link. Soft delete patterns are harder with composite keys.
- **Recommended Fix:** Add a UUID `id` column and keep `(parent_id, student_id)` as a unique constraint.

## Security Review

- FK constraints to parent, student, school — good.

## Performance Review

- Composite primary key — index on both columns, efficient for join lookups.

## Maintainability

- Very short, clean link table.

## Architecture Review

- Correct many-to-many design for parent-student relationships.
- `is_primary` flag supports primary guardian designation.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 7/10 |
