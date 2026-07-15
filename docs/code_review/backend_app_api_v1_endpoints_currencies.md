# File Reviewed

`backend/app/api/v1/endpoints/currencies.py` (83 lines)

## Overview

Currency management — list (with auto-seed), update exchange rate (with base-currency guard). Inline Pydantic response models.

## Issues

### Issue 1 — `seed_currencies` Called on Every GET Request

- **Lines:** 40
- **Severity:** Low
- **Category:** Performance
- **Description:** `seed_currencies(db)` is called on every GET /currencies. It should check if seeding is needed internally (likely using `get_or_create`), but calling it on every read request is wasteful.

### Issue 2 — Base Currency Mutation Guard

- **Lines:** 67-68
- **Severity:** Good
- **Category:** Security
- **Description:** Base currency (likely ETB) rate change is blocked. Good constraint.

### Issue 3 — Inline Response Models vs Shared Schemas

- **Lines:** 14-83
- **Severity:** Low
- **Category:** Code Quality
- **Description:** `CurrencyResponse`, `CurrencyUpdateRequest`, `CurrencyListResponse` are defined inline rather than in `app/schemas/currency.py`.

## Security Review

- VIEW_FINANCE permission for list, FINANCE_DIRECTOR for rate updates.
- Base currency mutation blocked.

## Performance Review

- Seed-on-read pattern could be optimized.

## Maintainability

- Clean with inline models.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Security | 8/10 |
| Performance | 7/10 |
| Readability | 8/10 |
| Maintainability | 7/10 |
| Enterprise Readiness | 7/10 |
