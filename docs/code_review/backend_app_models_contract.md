# File Reviewed

`backend/app/models/contract.py` (23 lines)

## Model

- `EmployeeContract` — school, staff profile, `contract_type`, `start_date`/`end_date`, `position`, `department`, `basic_salary` (DECIMAL), `status`, `notes`.

## Issues

### Issue 1 — `basic_salary` Is DECIMAL(15,2)

- **Lines:** 18
- **Severity:** Note
- **Category:** Data Integrity
- **Description:** Proper precision for salary data.

### Issue 2 — `end_date` Nullable for Ongoing Contracts

- **Lines:** 15
- **Severity:** Note
- **Category:** Design
- **Description:** Correct design — active contracts have no end date.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
