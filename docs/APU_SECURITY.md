# APU Security Model

Security hardening applied to the APU multi-school flow (Control Center, License Server, and the mobile app). All findings were verified by tests.

## License Server: school vs super-admin tokens

**Finding (fixed):** `POST /api/v1/auth/school/login` minted `role: super_admin` tokens via `create_access_token(school.email)`. School accounts could therefore call `/admin/*`, `/license/generate`, and `/license/school/*`.

**Fix:**
- New `create_school_token(school_id)` issues tokens with `role: school` and `sub = school_id`.
- School login now uses it; admin `get_current_admin` dependency still requires `role == super_admin`, so school tokens are rejected everywhere admin auth is required.
- Removed duplicate dead route definitions in `licenses.py` (a later second `/school/{school_id}` definition was shadowing `activate`/`generate`).

**Test:** `license-server/tests/test_security.py` (3/3):
- School login cannot access admin dashboard.
- School login cannot generate licenses.
- Admin login still works; heartbeat rejects bad HMAC and accepts correct HMAC.

## License Server: heartbeat authentication

**Finding (fixed):** `POST /api/v1/heartbeat` was unauthenticated and executed `UPDATE schools WHERE id = school_code`, which never matches (`school_code` is like `"OMEGA001"`, `School.id` is a UUID) — `last_sync_at` was never updated.

**Fix:**
- Heartbeat now requires `X-HMAC-Signature` header = HMAC-SHA256 of `school_code` using `HEARTBEAT_SECRET`.
- School resolution by `School.id` OR by `SchoolLicense.key → school_id` fallback.
- `heartbeat_secret: str = "dev-heartbeat-secret"` added to `license-server/app/core/config.py` with a startup warning if the default is in use.

## Control Center: admin endpoint authz

**Finding (fixed):** All admin endpoints were unauthenticated. `verify_token` accepted `token` as a query param while the frontend sends `Authorization: Bearer`, so auth effectively never worked.

**Fix:**
- `verify_token` converted to `HTTPBearer(auto_error=False)`; all admin CRUD / license / update / monitoring endpoints require a bearer token.
- Frontend already sent `Authorization: Bearer <cc_token>` (stored in `localStorage`), so this aligns the API with the existing UI.
- Public `/api/v1/public/*` endpoints remain open by design (partners, school lookup, resolve, config).

**Test:** `control-center/backend/tests/test_security_apu.py` (5/5):
- Admin endpoints reject unauthenticated requests.
- Admin endpoints accept bearer-authenticated requests.
- Public endpoints remain open.
- `resolve` returns branding + features; unknown code returns not-found.
- `config` returns the expected shape.

## Mobile app: credential storage and MFA

- Tokens and refresh tokens are stored in `SecureStore` (Keychain on iOS, Keystore on Android) — never plain AsyncStorage.
- School branding is cached in SecureStore as well.
- Login flow handles MFA: `POST /api/v1/auth/login` returning `{mfa_required: true, mfa_token}` routes to the MFA screen; `POST /api/v1/auth/mfa/login` exchanges `{mfa_token, mfa_code}` for the session. Invalid/expired MFA tokens surface the backend's `401` message.
- `refreshSession` uses `POST /api/v1/auth/refresh` with the stored refresh token.

## Tenant isolation principles

- Each school runs its own ERP backend + database. The APU app always targets the resolved school's own `api_url`.
- The Control Center only holds registration, branding, and licensing metadata — not school operational data.
- School credentials never authenticate against the Control Center or License Server for ERP operations; ERP auth happens only on the school's own backend.
- `resolve` only returns active customers (`is_active`), preventing deleted/suspended schools from being reached.
