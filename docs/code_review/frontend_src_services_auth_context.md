# File Reviewed

`frontend/src/services/auth-context.tsx` (103 lines)

## Context

- `AuthContext` with `AuthProvider` — manages user state, login, logout.
- On login: fetches `/auth/me` and redirects to role-specific dashboard.

## Issues

### Issue 1 — Good Auth Pattern

- **Lines:** 40-90
- **Severity:** Good
- **Category:** Architecture
- **Description:** Uses React Query for auth state, clears cookies on logout, redirects by role.

### Issue 2 — `any` in `getRole` and `normalizeUser`

- **Lines:** 17-23
- **Severity:** Low
- **Category:** Type Safety
- **Description:** Functions accept `any` and normalize user data.

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
