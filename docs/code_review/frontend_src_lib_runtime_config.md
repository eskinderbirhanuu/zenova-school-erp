# File Reviewed

`frontend/src/lib/runtime-config.ts` (16 lines)

## Functions

- `getApiUrl()` — returns API URL from `window.__RUNTIME_CONFIG__`, then `NEXT_PUBLIC_API_URL`, then fallback.

## Issues

### Issue 1 — Good Runtime Config Pattern

- **Lines:** 11-16
- **Severity:** Good
- **Category:** Architecture
- **Description:** Allows runtime API URL injection without rebuild — useful for multi-deploy.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Readability | 9/10 |
| Maintainability | 9/10 |
