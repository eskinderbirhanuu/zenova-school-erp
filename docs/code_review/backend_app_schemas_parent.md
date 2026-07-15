# File Reviewed

`backend/app/schemas/parent.py` (78 lines)

## Schemas

- `ParentCreate/Update/Response`, `ParentSearchRequest/Result`, `LinkStudentRequest`, `LinkedStudent`, `ParentWithStudents` (inherits `ParentResponse`).

## Issues

### Issue 1 — Good Validation on `ParentCreate`

- **Lines:** 7, 8
- **Severity:** Good
- **Category:** Security
- **Description:** Uses `Field(pattern="^(father|mother|guardian|other)$")` for relationship validation.

### Issue 2 — `ParentWithStudents` Extends `ParentResponse` Cleanly

- **Lines:** 77-78
- **Severity:** Good
- **Category:** Architecture
- **Description:** Inheritance pattern for enriched responses with linked data.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
