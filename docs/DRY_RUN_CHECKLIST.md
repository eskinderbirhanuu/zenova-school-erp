# ZENOVA Production Dry-Run Checklist

## Prerequisites
- [ ] Blank Ubuntu 22.04+ server (or VM) with 4GB+ RAM, 20GB+ disk
- [ ] Docker 24+ and Docker Compose plugin installed
- [ ] Git installed
- [ ] Domain pointing to server IP (for School ERP)
- [ ] License server deployed and reachable (or local license for offline test)

## 1. Network & Firewall
- [ ] SSH access works (port 22)
- [ ] HTTP (80) and HTTPS (443) ports open
- [ ] UFW or iptables configured
- [ ] Static IP configured (if on-prem)

## 2. License Server (cloud)
```bash
cp deploy/.env.license.example deploy/.env.license
# Edit .env.license with strong secrets
./deploy/deploy.sh license
# Verify
curl https://<license-server>/api/v1/license/ping
curl -X POST https://<license-server>/api/v1/license/school-verify \
  -H "Content-Type: application/json" \
  -d '{"key":"test-key","machine_fingerprint":"test"}'
```

## 3. School ERP (customer)
```bash
cp deploy/.env.vps.example deploy/.env.vps
# Edit .env.vps with domain, DB password, license key, license server URL
./deploy/deploy.sh school
```

### Super-Admin Setup (installer flow)
A fresh deploy has **no admin user** until the installer runs — `admin@zenova.app` exists only in backend tests, not in production.

**Verified end-to-end on the dry-run VM (2026-08-08).** Required two new Alembic migrations that earlier fresh deploys were missing (both in `backend/alembic/versions/`):
- `3f5a9c1d2e4b_add_license_enum_values.py` — adds `SUPER_ADMIN` to the `licensetype` DB enum and `REVIEW_MODE`/`DEVICE_LOCKED` to `licensestatus` (the initial migration `56e806ae8fa1` only created the subset used then; `alembic upgrade head` on a fresh DB fails to seed a `SUPER_ADMIN` license without it).
- `9a4b5c6d7e8f_add_missing_schema_fixes.py` — closes the full schema drift vs. the models: tables `currencies`, `device_fingerprints`, `teacher_subjects`; columns `invoices.currency_code`, `payments.currency_code`, plus missing `deleted_at`/`created_at` columns (e.g. `server_identities.deleted_at`, `sync_queue.deleted_at`, `number_sequences.created_at`). Without it the installer 500s and re-running `schema_diff.py` (compare models to live DB) shows the drift.

Steps:

1. In `.env.vps`, set `MASTER_SETUP_KEY=<strong secret>` (maps to `settings.master_setup_key`). Backend containers must be recreated after editing it (`docker compose up -d backend`).
2. Ensure `ZENOVA_LICENSE_SERVER` points at a reachable license server (cloud or local) so `verify_license` passes.
3. Generate a `SUPER_ADMIN` license key (via Control Center → Generate license, or directly on the license server) and seed it into the DB. Note the `licensetype` enum stores **member names** (`SUPER_ADMIN`, not `super_admin`). The seeded row must have `created_at` set (raw SQL inserts that omit it make `GET /api/v1/licenses` 500 with a pydantic `datetime` validation error).
4. Confirm readiness: `GET /api/v1/installer/status` → `server_identity_exists:false`, `has_master_key:true`.
5. Initialize the super admin (this POST requires a CSRF token first: `GET /api/v1/auth/csrf-token`, send both the `csrftoken` cookie and the token in the body):
```bash
curl -X POST https://<domain>/api/v1/installer/initialize-super-admin \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrf-token>" \
  -b "csrftoken=<csrf-token>" \
  -d '{
    "fingerprint":"<server-machine-fingerprint>",
    "master_setup_key":"<MASTER_SETUP_KEY>",
    "super_admin_license":"<SUPER_ADMIN-license-key>",
    "email":"admin@<your-school>.com",
    "password":"<strong-password>"
  }'
```
Expected: `201` → `{success:true, server_id:..., email:..., message:"Super admin server activated successfully"}`. The chosen email/password are then the login credentials (not `admin@zenova.app`).

Gotchas hit during the dry-run (all fixed):
- Installer is rate-limited (`installer_init`, 3/hour per IP; Redis key `ratelimit:installer_init:<ip>`). Failed attempts burn quota — clear the key in Redis to retry sooner.
- The `/data` volume (`deploy_server-data`) is root-owned but the backend container runs as uid 999 (`zenova`); `server_id.json` writes fail with `PermissionError` until you `chown -R 999:999 <volume dir>`.
- `bind_license_to_hardware` (`app/services/license_crypto.py`) commits internally, so a later failure (e.g. identity save) leaves partial state (bound license + orphan admin user). If the installer 500s after the license verify step, unbind the license, delete `server_identities` rows, and delete the half-created admin user before retrying.

**Known product gap — MFA setup:** `MFA_REQUIRED_ROLES` (`app/core/constants.py`) includes `SUPER_ADMIN`, so login is rejected with `PERM_001` ("MFA is required for your role") until MFA is enabled — but there is **no MFA setup UI** anywhere (web frontend or APU mobile app). `/api/v1/auth/mfa/setup` exists but requires an already-authenticated token, a chicken-and-egg for a fresh super admin. For the dry-run we enabled MFA directly in the DB with a known TOTP secret to verify the two-step login; a real MFA setup screen is outstanding product work.

### Health Checks
- [x] Super-admin setup completed via installer flow (see above)
- [x] Login works with the installer-created super-admin credentials (two-step: `/auth/login` → `mfa_token`, then `/auth/mfa/login` with TOTP)
- [x] Super-admin dashboard API loads (`GET /api/v1/platform/admin/dashboard` → 200 with platform stats)
- [x] Core super-admin APIs authenticated: `GET /api/v1/schools` → 200, `GET /api/v1/licenses` → 200
- [x] Admin dashboard loads (`GET /api/v1/dashboard/overview` + `/trends` → 200)
- [x] Teacher dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Student dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Parent dashboard loads (`/dashboard/overview` + `/trends` → 200; `parent-portal/dashboard` → 400 "not linked" until a `Parent` profile is linked to the user — see note below)
- [x] Registrar dashboard loads (`/dashboard/overview` + `/trends` → 200; `/students`, `/classes` → 200)
- [x] Finance dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Director dashboard loads (`/dashboard/overview` + `/trends` → 200; `platform/dashboard` → 400 "No school associated" until the user has a `school_id`)
- [x] Library dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Cafeteria dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] HR dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Inventory dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Auditor dashboard loads (`/dashboard/overview` + `/trends` → 200)
- [x] Corporate dashboard loads (corpadmin@zenova.app + `ZENOVA_CORPORATE_ADMIN` role seeded by the §3 harness; `GET /corporate/dashboard` → 200 for corpadmin, 403 for a plain ADMIN)

> **Role-dashboard validation method (dry-run 2026-08-09):** 13 test users (`role{admin,teacher,student,registrar,parent,director,library,hr,cafeteria,inventory,auditor}@zenova.app` + `financetest@zenova.app` + the installer super admin) were created in the VM DB, and `/api/v1/dashboard/overview` + `/api/v1/dashboard/trends` were called with minted access tokens via `localhost:8000` inside the backend container. All 13 roles returned **200/200**. Endpoints that return non-200 are **correct empty-DB behavior**, not bugs (documented inline above).

> **Bug found & fixed during validation:** both `parent_portal.py` and `parent_payments.py` read `current_user.parent_id`, which **does not exist** on the `User` model → every parent dashboard request 500'd (`AttributeError`). Fixed in `67a8e6e`: parent profile is now resolved via `Parent.user_id == current_user.id` (new `get_parent_for_user()` in `parent_service.py`); the `parent_payments` router was **also never registered** in `router.py` (all `/api/v1/parent-payments/*` returned 404) — now included. Verified live: parent endpoints 500→400 / 404→400. Regression tests in `backend/tests/test_parent_portal_endpoints.py` (6 tests); full backend suite 468 passed.

### Feature Checks
- [x] Create a student → appears in student list (**see bug fix below**)
- [x] Mark attendance → 403 outside 08:00–10:00 Ethiopian window (by design; the check harness opens the window in-process to exercise the real code path)
- [x] Generate report card → PDF downloads (**was blocked until the student-create bug was fixed**)
- [x] Process a payment → appears in financial reports
- [x] Create an announcement → visible to users
- [x] NFC/QR card registration → **gated** without a valid school license (`403` — expected; NFC/QR are license-gated features, keep code dormant but present per architecture)
- [x] Password recovery flow (offline-first) → initiate/approve/temp-password verified (**approval + temp-password require the DIRECTOR token when the target is an ADMIN**; script-side, not an app bug)

> **§3 in-container harness (`feat_check.py`)** seeds a school (`DRYRUN1`), links role users to DB roles, and drives full CRUD over the live API (localhost:8000 in the container). CSRF handling for production: fetch `GET /auth/csrf-token`, then send `X-CSRF-Token` + a manual `Cookie: csrf_token=<token>` header (the Secure cookie is never returned by a browser-grade cookie jar over plain HTTP, and the container resolves `localhost` → `localhost.local`).

> **Genuine bugs found & fixed during §3 (all locally regression-tested, deployed to the VM):**
> - **P0 `POST /corporate/employees` → 500 `INT_001`:** `corporate.py:create_employee` called `corporate_service.create_employee(**data.model_dump(), created_by=...)` **without `db`** → `TypeError: missing required positional argument: 'db'`. Fixed to pass `db=db`.
> - **P0 `POST /students` → 500 `INT_001` after commit:** `Notification.school_id` is `NOT NULL` but `send_notification()` never set it, so the admin-notification loop after `create_student` raised `NotNullViolation`. The student row was committed but the API returned 500 with no `id` → exam-result/report-card/invoice then failed with null `student_id`. Fixed by threading `school_id` through `send_notification` (all callers: student, academic, finance, notification_service, `_alert_new_device`) **and** making the column nullable defensively (migration `4d6e8f0a2c4e`, model updated) so super-admin/system notifications can't abort a primary transaction.
> - **Latent `ImportError` on new-device login:** `_alert_new_device` imported `send_notification` from `app.core.notifications`, which has no such function (it lives in `app.services.communication_service`). Fixed the import + passes `school_id`.
> - Regression tests: `backend/tests/test_dryrun_500_regressions.py` (5 tests). Full backend suite: **499 passed**.
> - **Correct-by-design / script-side:** attendance window check (08:00–10:00 Ethiopian time); `recovery-approve`/`temp-password` require DIRECTOR for an ADMIN target (`RECOVERY_HIERARCHY` in `password_recovery_service.py`); NFC/QR are license-gated.

### Backup & Recovery
- [ ] `docker compose exec -T db pg_dump` works
- [ ] Restore from backup works
- [ ] Rollback: `docker compose down` + restore images + `docker compose up -d`

## 4. Control Center (admin)
```bash
cp deploy/.env.cc.example deploy/.env.cc
./deploy/deploy.sh cc
```
- [ ] Login as super admin
- [ ] Generate license key
- [ ] View customers list
- [ ] Upload update package
- [ ] View monitoring dashboard

### APU Public API Verification (APU mobile app dependency)
The APU app needs these public endpoints before any school can sign in through it:
```bash
# 1. Remote config (version gates / maintenance mode)
curl https://<control-center>/api/v1/public/config
# expect: {"minimum_version":"1.0.0","recommended_version":"1.0.0","maintenance_mode":false,...}

# 2. Resolve a school by its code (branding + api_url)
curl -X POST https://<control-center>/api/v1/public/schools/resolve \
  -H "Content-Type: application/json" \
  -d '{"code":"<SCHOOL_CODE>"}'
# expect: {"found":true,"school":{...,"api_url":"https://<school-domain>","branding":{...},"features":{...}}}

# 3. Unknown/inactive code must not resolve
curl -X POST https://<control-center>/api/v1/public/schools/resolve \
  -H "Content-Type: application/json" \
  -d '{"code":"NO_SUCH_SCHOOL"}'
# expect: {"found":false}
```
- [ ] `/api/v1/public/config` returns version + feature shape
- [ ] `/api/v1/public/schools/resolve` returns branding + `api_url` for an active customer
- [ ] Unknown code returns `{"found":false}` (no data leak)
- [ ] Admin endpoints reject requests without `Authorization: Bearer` (401)

## 5. Update Simulation
- [ ] Backup DB
- [ ] Deploy new version
- [ ] Run migrations
- [ ] Health check all systems
- [ ] Rollback on failure

## 6. Load Test (optional)
- [ ] 50 concurrent users login
- [ ] 100 concurrent API calls to /api/v1/students
- [ ] Memory stays under 80%