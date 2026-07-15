# File Reviewed

`backend/app/models/fee.py` (43 lines)

## Overview

Fee management models: FeeType (tuition, registration, etc.), FeeStructure (amount per class), FeeAssignment (per-student fee application with academic year linkage).

## Issues

### Issue 1 — `frequency` on FeeType Is Free-Text String

- **Line:** 12
- **Severity:** Medium
- **Category:** Code Quality
- **Description:** `frequency` is `String(20)` with no enum. Valid values: "monthly", "termly", "yearly", "one_time".
- **Why it is a problem:** Inconsistent frequency values break invoice generation logic.
- **Potential Impact:** Invoices generated with wrong frequency — students over- or under-charged.
- **Recommended Fix:** Use a `FeeFrequency` enum.

### Issue 2 — `due_date` on FeeStructure Is String Instead of Date

- **Line:** 27
- **Severity:** Medium
- **Category:** Data Integrity
- **Description:** `due_date` is `String(100)` instead of `Date`. Some values may be date expressions like "15th of each month" rather than actual dates.
- **Why it is a problem:** The field stores unstructured text instead of actual dates. This prevents date-based querying and sorting.
- **Potential Impact:** Cannot calculate overdue fees, aging reports, or send due-date reminders.
- **Recommended Fix:** Use a `Date` column if it's a fixed date, or create a separate `due_day_of_month` integer field.

### Issue 3 — No `discount` or `waiver` Tracking on FeeAssignment (Beyond `is_waived`)

- **Line:** 41
- **Severity:** Low
- **Category:** Functionality
- **Description:** FeeAssignment has `is_waived` boolean but no partial discount field.
- **Why it is a problem:** Scholarships and partial discounts can't be tracked at the fee assignment level.
- **Potential Impact:** Fee reports can't distinguish between full waiver and partial discount.

## Security Review

- FK constraints to fee_type, school, class, student, academic_year — good.
- No security issues.

## Performance Review

- No performance concerns.

## Maintainability

- Clean three-level hierarchy (FeeType → FeeStructure → FeeAssignment).
- Well-named fields.

## Architecture Review

- Fee hierarchy is correctly normalized.
- The string `due_date` is a design flaw that prevents date-based functionality.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
| Enterprise Readiness | 6/10 |
