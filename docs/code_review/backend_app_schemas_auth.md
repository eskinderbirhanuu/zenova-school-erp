# File Reviewed

`backend/app/schemas/auth.py` (99 lines)

## Schemas

- `LoginRequest`, `RegisterRequest`, `TokenResponse`, `RefreshRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`.
- MFA schemas: `MFASetupResponse`, `MFAVerifyRequest`, `MFALoginRequest`, `MFAVerifyResponse`, `MFADisableRequest`, `MFABackupCodesResponse`.
- `UserResponse`, `LoginAuditResponse`.

## Issues

### Issue 1 — Good MFA Schema Coverage

- **Lines:** 45-70
- **Severity:** Good
- **Category:** Security
- **Description:** Full password-reset and MFA flow with validation (min_length=8, max_length=128 for passwords).

### Issue 2 — `LoginRequest` Allows Either Email or Employee ID

- **Lines:** 5-9
- **Severity:** Good
- **Category:** Architecture
- **Description:** Both `email` and `employee_id` are optional but at least one expected (logic in service layer).

## Final Score

| Criteria | Score |
|---|---|
| Architecture | 8/10 |
| Security | 8/10 |
| Readability | 8/10 |
| Maintainability | 8/10 |
