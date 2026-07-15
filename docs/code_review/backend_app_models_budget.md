# File Reviewed

`backend/app/models/budget.py` (30 lines)

## Models

- `Budget` — name, `academic_year_id` FK, `school_id` FK, `total_amount` (DECIMAL).
- `BudgetItem` — `budget_id` FK, `account_id` FK, description, `planned_amount`, `actual_amount`.

## Issues

### Issue 1 — `Budget` and `BudgetItem` Both Have `school_id`

- **Lines:** 13, 25
- **Severity:** Low
- **Category:** Data Redundancy
- **Description:** `BudgetItem.school_id` is redundant since it can be derived via `Budget.school_id`. But it simplifies queries.

### Issue 2 — `BudgetItem` Has No `created_at` or User Tracking

- **Lines:** 20-30
- **Severity:** Low
- **Category:** Audit
- **Description:** `BudgetItem` lacks `created_by`, `created_at`, and `updated_at` fields.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
