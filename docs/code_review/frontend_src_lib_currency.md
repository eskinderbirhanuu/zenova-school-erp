# File Reviewed

`frontend/src/lib/currency.ts` (36 lines)

## Functions

- `formatCurrency(amount, currencyCode)` — formats with symbol and locale.
- `getCurrencySymbol(code)` — returns symbol for code.
- `fetchCurrencies()` — fetches exchange rates from API.

## Issues

### Issue 1 — Missing `@/services/api` Import Circular Dependency Risk

- **Lines:** 26-27
- **Severity:** Low
- **Category:** Architecture
- **Description:** Dynamic `import()` to avoid hard dependency — adequate pattern.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 7/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
