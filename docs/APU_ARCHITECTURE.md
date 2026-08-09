# APU Multi-School Architecture

This document describes the **APU (one app, many schools)** extension to ZENOVA: a single mobile app that lets users from many independent schools sign in, with per-school branding, strict tenant isolation, and central management via the Control Center and License Server.

## Components

| Component | Path | Role |
|-----------|------|------|
| **APU mobile app** | `mobile-app/` | Single Expo/React Native app (SDK 57, RN 0.86, TypeScript) installed by every school's parents/students/teachers. Boots → resolves the school → branded login → role-aware home. |
| **Control Center** | `control-center/` | Central management: registers customers/schools, publishes public branding (`/api/v1/public/*`) and remote config (app version gates, feature flags, maintenance mode). Admin endpoints require bearer auth. |
| **License Server** | `license-server/` | Cloud license validation + heartbeat. School login tokens are scoped (`role: school`) and cannot reach admin/super-admin endpoints. Heartbeat is HMAC-verified. |
| **School ERP backend** | `backend/` | Each school runs its own ERP instance. The APU app authenticates against the resolved school's own `/api/v1/auth/login`. |

## Boot flow (APU app)

1. **Boot**: read stored school URL, session token, and cached school branding from SecureStore.
2. **Resolve (first run)**: user enters a School ID code → `POST {CONTROL_CENTER}/api/v1/public/schools/resolve` with `{code}` → returns `{found, school: {name, domain, code, api_url, branding, features}}`.
3. **Remote config**: `GET {CONTROL_CENTER}/api/v1/public/config` → `{minimum_version, recommended_version, maintenance_mode, message, features}`.
   - If `maintenance_mode` is true → show maintenance screen.
   - If app `APP_VERSION` < `minimum_version` → show "update required" screen.
4. **Login**: against `school.api_url` (`/api/v1/auth/login`). If `{mfa_required: true, mfa_token}` → MFA screen → `POST /api/v1/auth/mfa/login` with `{mfa_token, mfa_code}`.
5. **Home**: role-aware dashboard (PARENT/STUDENT/TEACHER/ADMIN feature grids).

## School branding

`Customer` records in the Control Center carry branding fields:

- `logo_url` (VARCHAR 500, default `""`)
- `primary_color` (default `#6366F1`), `secondary_color` (`#8B5CF6`), `accent_color` (`#EC4899`)
- `tagline` (VARCHAR 255)
- `features` (TEXT, JSON object, default `"{}"`)

The resolve endpoint returns the branding; the app converts it to a theme via `themeFromBranding()` in `mobile-app/src/theme/colors.ts`. Theme logic:

- Gradient = `[primary, secondary, accent, accent]`.
- Button text contrast is WCAG-checked (`hasWhiteTextContrast()`, 4.5:1). If the school color fails, white text is replaced with dark text so arbitrary school colors can never break button readability.
- Invalid colors fall back to ZENOVA defaults.

`database.py` `init_db()` calls `_ensure_customer_branding_columns()` which issues idempotent `ALTER TABLE` statements (SQLite-safe) because `create_all` does not migrate existing tables.

## Public vs protected endpoints (Control Center)

Public (no auth):

- `GET /api/v1/public/partners`
- `GET /api/v1/public/schools`
- `POST /api/v1/public/schools/resolve` — body `{code}`; only `is_active` customers; code matches `domain LIKE 'code.%'` or exact domain.
- `GET /api/v1/public/config` — from `control-center/backend/app/remote_config.json`.

Protected (require `Authorization: Bearer <token>` via `HTTPBearer`):

- All admin CRUD (`/api/v1/admin/customers`, `/api/v1/admin/schools`, etc.), license management, update/monitoring endpoints.

## Remote config

`control-center/backend/app/remote_config.json`:

```json
{
  "minimum_version": "1.0.0",
  "recommended_version": "1.0.0",
  "maintenance_mode": false,
  "message": "",
  "features": {
    "attendance": true,
    "finance": true,
    "library": true
  }
}
```

The app reads this at boot and gates on `maintenance_mode` and `minimum_version`. See `mobile-app/src/services/config.ts` (`fetchRemoteConfig`, `isVersionAtLeast`, `FALLBACK_CONFIG` never blocks boot).

## Key source files

- `mobile-app/App.tsx` — stage machine: booting → school → login → mfa → home → update.
- `mobile-app/src/screens/SchoolSelectScreen.tsx` — School ID resolve field + search + manual URL entry.
- `mobile-app/src/screens/LoginScreen.tsx` — themed, MFA-aware login.
- `mobile-app/src/screens/MFAScreen.tsx` — 6-digit TOTP.
- `mobile-app/src/screens/HomeScreen.tsx` — role-aware dashboard.
- `mobile-app/src/screens/UpdateRequiredScreen.tsx` — maintenance / update-required gate.
- `mobile-app/src/theme/colors.ts` — branding → theme + WCAG contrast.
- `mobile-app/src/services/{resolve,config,auth,storage}.ts` — school resolution, remote config, MFA login / refresh, SecureStore persistence.
- `control-center/backend/app/api/v1/endpoints/partners.py` — public resolve/config endpoints.
- `control-center/backend/app/models/customer.py`, `schemas/customer.py`, `app/database.py` — branding/features fields.
