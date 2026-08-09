# APU Authentication

> **Status:** DOCUMENTATION/ARCHITECTURE PHASE.
> WHAT / WHY / HOW / WHAT-it-reuses for authentication, tokens, MFA, and secure storage.

## 1. WHAT are we building?

A **single, shared login** for TEACHER, PARENT, and STUDENT against the school's own ZENOVA backend. No separate login system per role. The backend is the **authoritative identity/authorization source**; the client only manages token transport and secure storage.

## 2. WHY

- One login experience across roles reduces UI complexity and keeps security in one place.
- Reusing the existing backend auth stack avoids a second authentication system (explicitly forbidden).

## 3. HOW it works (verified against `backend/app/api/v1/endpoints/auth.py`)

### 3.1 Login
```
POST {school}/api/v1/auth/login
Body: { email | employee_id, password, device_fingerprint? }
```
- `email` OR `employee_id` identifies the user (PARENT/STUDENT use email; staff may use employee number).
- On success the backend sets **httpOnly cookies**: `access_token` (30 min), `refresh_token` (7 days), `user_role`, `user_roles`. The JSON body returns `access_token: null`, `refresh_token: null`, `mfa_required`, `mfa_setup_required`, `mfa_token`, `role_name`.
- **APU behavior:** read the JWT values from the `Set-Cookie` headers (`mobile-app/src/services/auth.ts` already does this) and store them in SecureStore for `Authorization: Bearer` use. The cookie is not persisted by the app.

### 3.2 MFA (TOTP)
- Roles `SUPER_ADMIN` and `FINANCE` **require** MFA (`MFA_REQUIRED_ROLES`). TEACHER/PARENT/STUDENT only get MFA if individually `mfa_enabled`.
- If `mfa_required` → response includes a 5-minute `mfa_token` (`type: "mfa_step_up"`).
- `POST /api/v1/auth/mfa/login` with `{mfa_token, mfa_code}` completes 2FA and issues the real session cookies.
- **Bootstrap path** (fresh account, no access token yet): `POST /auth/mfa/bootstrap/setup` + `POST /auth/mfa/bootstrap/verify` (returns 10 single-use backup codes). The APU already implements this in `MFAScreen.tsx`.

### 3.3 Refresh
```
POST {school}/api/v1/auth/refresh
Body: { refresh_token }
```
- Returns a new access token; the old refresh `jti` is blacklisted and the family is rotated (reuse detection revokes the whole family).
- **APU behavior:** `mobile-app/src/services/auth.ts#refreshSession` exists but is **unused** today. The APU must add a token-refresh interceptor that calls this on `401` before signing the user out.

### 3.4 Logout
```
POST {school}/api/v1/auth/logout
```
- Blacklists the access token `jti` and removes the session from the Redis registry.
- **Note:** `/logout` is **NOT** CSRF-exempt → the app must send a valid CSRF token (see §5).

### 3.5 Authoritative profile
```
GET /auth/me
GET /auth/me/employee-id
```
- Returns the user's profile/roles — use to confirm role after login and after refresh.

## 4. Token model (verified)

| Item | Value |
|---|---|
| Access token | JWT, 30 min (`access_token_expire_minutes`), claims `sub`(user UUID), `role`, `type: "access"`, `jti` |
| Refresh token | JWT, 7 days, `type: "refresh"`, `jti` |
| Signing | RS256 (if `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` set) else HS256 |
| Storage on server | Redis session registry `sessions:{user_id}` (max **5 concurrent sessions**), token blacklist `token:bl:{jti}` |
| Device fingerprint | `DeviceFingerprint` table; `device_fingerprint` in login request triggers `NEW_DEVICE_LOGIN` notification |
| Security controls | brute-force (Redis, 20/IP + 5/identifier, 900s), rate limit (5 per 300s per IP) |

## 5. CSRF for mobile (verified — critical)

The global `CSRFMiddleware` (`backend/app/main.py`) requires **both** a `csrf_token` cookie and a matching `X-CSRF-Token` header on **every non-GET request under `/api/`** unless the path is in `CSRF_EXEMPT_PATHS` (login, refresh, MFA, recovery, reset/forgot/change password, register, webhooks, setup/installer/activate, `/sync/pull`).

**Consequences for APU:**
- `GET` calls: free.
- Exempt `POST`s (`/auth/login`, `/auth/refresh`, `/auth/mfa/*`, recovery): free.
- **All other mutating calls** (`POST /parent-portal/payments`, `POST /parent-payments/create-session`, `POST /attendance/bulk`, `PATCH /attendance/{id}`, `POST /notifications/{id}/read`, `POST /messages`, `POST /auth/logout`, …):
  1. Call `GET /api/v1/auth/csrf-token` (exempt) → returns the token in the body **and** sets the `csrf_token` cookie.
  2. Store the token; on the mutating request send both `Cookie: csrf_token=<value>` and `X-CSRF-Token: <value>`.
- **MOBILE GAP:** the APU HTTP client must implement a CSRF token helper and attach it to every non-exempt mutating call. This is a client-side addition only.

## 6. Secure token storage

- Use **SecureStore** (Keychain on iOS, Keystore on Android) — `mobile-app/src/services/storage.ts` already does this.
- Never store passwords. Never store tokens in AsyncStorage or plain files.
- Branding/session values stored via SecureStore: `zenova.schoolUrl`, `zenova.accessToken`, `zenova.refreshToken`, `zenova.schoolBranding`, `zenova.partnerFeedCache`.

## 7. Session expiry & restore

- Boot currently trusts a stored token without validation. **MOBILE GAP:** on boot, validate with `GET /auth/me` (or refresh); on failure route to login.
- After expiry: attempt `POST /auth/refresh`; if that fails, clear session → login.
- Enforce the 5-session server limit by logging out unused devices (device/session management is a future APU cycle).

## 8. Security requirements (from section 11 of the APU requirements)

1. Never store passwords in plaintext.
2. Never bypass backend authorization — permission and ownership checks happen server-side.
3. Never assume LAN access means trusted access — local mode still requires the same login.
4. TLS for all cloud connections; for local HTTP traffic, document the trust model (see `APU_LOCAL_TEACHER_MODE.md`).
5. Sensitive data stored only in SecureStore.
6. WS notifications authenticate via `?token=<access JWT>` — never reuse a refresh token in the URL.

## 9. WHAT it reuses

| Piece | Reused from |
|---|---|
| Login/refresh/MFA/logout endpoints | `backend/app/api/v1/endpoints/auth.py` |
| JWT sign/verify | `backend/app/services/auth_service.py` |
| MFA (TOTP + backup codes) | `backend/app/services/mfa_service.py` |
| Rate limit + brute force | `backend/app/core/rate_limit.py` |
| Device fingerprint tracking | `DeviceFingerprint` model |
| CSRF token endpoint | `GET /api/v1/auth/csrf-token` |
| Offline-first password recovery | `backend/app/api/v1/endpoints/password_recovery.py` |

## 10. Dependencies / assumptions / risks / unresolved

- **Dependencies:** `expo-secure-store` (installed); `CONTROL_CENTER_URL` for school resolve only — auth is purely per-school.
- **Assumptions:** login returns cookies we can parse for tokens; the backend's CSRF exemption list remains as verified.
- **Risks:** CSRF cookie persistence across app restarts; cookie parsing if the backend switches to in-body tokens.
- **Unresolved:** whether to enable PARENT/STUDENT self-registration in APU (`/auth/register`); whether MFA should be offered (not required) to the three APU roles.
