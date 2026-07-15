# File Reviewed

`backend/app/services/currency_service.py` (48 lines)

## Overview

Currency service — seeds default currencies (ETB base, USD, EUR, GBP, AED, SAR, KES, UGX, TZS), retrieves active currencies, and converts between currencies via ETB as intermediary.

## Issues

### Issue 1 — Conversion Via ETB Introduces Rounding Error

- **Lines:** 40-48
- **Severity:** Medium
- **Category:** Accuracy
- **Description:** Conversion is done via `amount * from_rate / to_rate` using ETB as intermediary. This is functionally equivalent to direct conversion (since rates are relative to ETB), but the intermediate multiplication can introduce floating-point rounding errors.
- **Why it is a problem:** Financial calculations with rounding errors accumulate.
- **Potential Impact:** Pennies lost or gained on currency conversion.
- **Recommended Fix:** Use `Decimal` throughout for financial precision.

### Issue 2 — `exchange_rate_to_etb` Stored as Float in Model

- **Lines:** 26 (referenced)
- **Severity:** Medium
- **Category:** Architecture
- **Description:** Exchange rates are stored as float in the Currency model. Float is imprecise for financial calculations.
- **Why it is a problem:** Floating-point arithmetic for financial values can produce inaccurate results.
- **Potential Impact:** Inconsistent pricing across currencies.

### Issue 3 — Hardcoded Rates Stale on Deploy

- **Lines:** 4-14
- **Severity:** Low
- **Category:** Operations
- **Description:** Exchange rates are hardcoded and only updated on deploy. They will drift from market rates.
- **Why it is a problem:** Financial calculations use outdated rates.
- **Potential Impact:** Pricing discrepancies.

## Security Review

- No user input beyond currency code — safe.

## Performance Review

- Simple lookups — no concerns.

## Maintainability

- Clean and simple.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 6/10 |
| Security | 9/10 |
| Performance | 9/10 |
| Readability | 9/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 5/10 |
