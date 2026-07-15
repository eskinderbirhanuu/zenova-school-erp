# File Reviewed

`backend/app/models/currency.py` (17 lines)

## Overview

Currency model — multi-currency support with exchange rates relative to ETB. Supports base currency designation and active/inactive state.

## Issues

### Issue 1 — No `updated_at` Timestamp

- **Lines:** 7-17
- **Severity:** Low
- **Category:** Functionality
- **Description:** Currency has `created_at` but no `updated_at` field for tracking exchange rate changes.
- **Why it is a problem:** When exchange rates are modified, there's no way to know when the update occurred.
- **Potential Impact:** Cannot audit rate changes or roll back to previous rates.
- **Recommended Fix:** Add `updated_at` field.

### Issue 2 — `exchange_rate_to_etb` Has 6 Decimal Places — May Be Insufficient for Volatile Currencies

- **Line:** 14
- **Severity:** Low
- **Category:** Functionality
- **Description:** `DECIMAL(15, 6)` provides 6 decimal places for the exchange rate.
- **Why it is a problem:** For very weak currencies (e.g., 1 USD = 50,000+ ETB equivalent in some scenarios), 6 decimal places may be insufficient precision.
- **Potential Impact:** Rounding errors on large transaction volumes.
- **Recommended Fix:** Increase to `DECIMAL(20, 8)` for future-proofing.

## Security Review

- No security issues.

## Performance Review

- Index on `code` for fast lookup by currency code.
- Very small table — no performance concerns.

## Maintainability

- Clean, minimal model.
- Well-named fields.

## Architecture Review

- Multi-currency support is correctly implemented with ETB as the base currency.
- `is_base` flag designates the reference currency.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 10/10 |
| Performance | 10/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
| Enterprise Readiness | 8/10 |
