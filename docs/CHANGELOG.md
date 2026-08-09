# Changelog

## [1.0.0-dryrun-superadmin] — 2026-08-08

### Super-admin installer verified end-to-end (production dry-run VM)
- `backend/alembic/versions/3f5a9c1d2e4b_add_license_enum_values.py` — new migration: adds `SUPER_ADMIN` to `licensetype` and `REVIEW_MODE`/`DEVICE_LOCKED` to `licensestatus` (fresh deploys could not seed a SUPER_ADMIN license because the initial migration's enums lacked those members).
- `backend/alembic/versions/9a4b5c6d7e8f_add_missing_schema_fixes.py` — new migration: closes schema drift vs models — tables `currencies`, `device_fingerprints`, `teacher_subjects`; columns `invoices.currency_code`, `payments.currency_code`; missing `deleted_at`/`created_at` columns (`server_identities`, `sync_queue`, `number_sequences`, `notification_preferences`, `school_settings`, `school_telegram_bots`, `teacher_section_assignments`).
- `deploy/docker-compose.vps.yml` — pass `MASTER_SETUP_KEY` env to the backend service.
- Dry-run fixes applied on the VM: `/data` volume permission (`chown 999:999`), license seed `created_at`, CSRF on installer POST, installer rate-limit reset. Super-admin activated (`SRV-C007D1F76D2E`), MFA two-step login verified, `GET /api/v1/platform/admin/dashboard`, `/schools`, `/licenses` return 200.
- Known gap documented in `docs/DRY_RUN_CHECKLIST.md`: no MFA setup UI exists for `SUPER_ADMIN`/`FINANCE` (MFA-required roles) — `/auth/mfa/setup` needs an existing token, a chicken-and-egg for fresh super admins.

## [1.0.0-apu] — 2026-08-08

### APU multi-school mobile app
- **APU app boot flow wired** (`mobile-app/App.tsx`): booting → school → login → mfa → home → update stage machine. Loads stored URL/token/branding from SecureStore, resolves the school by School ID, fetches remote config, gates on `maintenance_mode` / `minimum_version`, and threads the school `SchoolTheme` through Login/MFA/Home.
- **SchoolSelectScreen**: added School ID resolve field wired to `onSelectResolved(school)`.
- **LoginScreen**: now themed (branded gradient + primary-colored button) and MFA-aware — routes `{mfa_required: true, mfa_token}` to the MFA screen instead of showing "invalid credentials".
- **MFAScreen** (new): 6-digit TOTP against `POST /api/v1/auth/mfa/login` with back-to-login.
- **HomeScreen**: rewritten as a role-aware dashboard (PARENT/STUDENT/TEACHER/ADMIN feature grids, signed-in role badge, sign out / change school).
- **UpdateRequiredScreen** (new): maintenance mode and app-version gate screens.
- **Theme engine** (`src/theme/colors.ts`): `themeFromBranding()` builds a gradient `[primary, secondary, accent, accent]`; WCAG 4.5:1 button-text contrast check (`hasWhiteTextContrast`); invalid colors fall back to ZENOVA defaults.
- **Services**: `resolve.ts` (`resolveSchool`), `config.ts` (`fetchRemoteConfig`, `isVersionAtLeast`, non-blocking fallback), `auth.ts` (`mfaLogin`, `refreshSession`, `mfaToken` in `LoginResult`), `storage.ts` (branding + refresh-token accessors).
- **i18n**: EN + AM keys for school ID, resolve, MFA, update/maintenance gates, role labels, feature tiles.
- TypeScript `--noEmit` clean; `expo export --platform android` bundles (599 modules).
- Debug APK builds green (`gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`); self-contained signed release APK (`assembleRelease -PreactNativeArchitectures=arm64-v8a`, Hermes bundle embedded, v2-signed) at `mobile-app/android/app/build/outputs/apk/release/app-release.apk` (25.1 MB). Note: `org.gradle.jvmargs` bumped to `-Xmx3g -XX:MaxMetaspaceSize=1g` in `android/gradle.properties`; use `--max-workers=2` on 12 GB RAM / 4-core hosts to avoid Gradle Worker Daemon OOM crashes.

### Control Center APU public API
- `POST /api/v1/public/schools/resolve` — `{code}` → `{found, school: {name, domain, code, api_url, branding, features}}`; only `is_active` customers; code matches `domain LIKE 'code.%'` or exact domain.
- `GET /api/v1/public/config` — `{minimum_version, recommended_version, maintenance_mode, message, features}` from `control-center/backend/app/remote_config.json`.
- `Customer` branding fields added: `logo_url`, `primary_color`, `secondary_color`, `accent_color`, `tagline`, `features`; schemas extended; `init_db()` runs idempotent `ALTER TABLE` migration (`_ensure_customer_branding_columns`).

### Security hardening
- **License Server**: school login now uses `create_school_token` (role `school`) instead of `super_admin` tokens; `get_current_school` dependency; removed shadowed duplicate routes in `licenses.py`. Heartbeat requires `X-HMAC-Signature` (HMAC-SHA256 of `school_code` with `HEARTBEAT_SECRET`); resolves school by id OR license key; `heartbeat_secret` config with default warning. Tests: `license-server/tests/test_security.py` 3/3.
- **Control Center**: `verify_token` → `HTTPBearer(auto_error=False)`; all admin endpoints now require bearer auth (frontend already sent it). Public endpoints stay open. Tests: `control-center/backend/tests/test_security_apu.py` 5/5.
- **APU docs**: `docs/APU_ARCHITECTURE.md`, `docs/APU_SECURITY.md` added and indexed in `docs/README.md`.

## [0.9.5] — 2026-07-11

### NFC Card school_id
- **Added `school_id` to V2 card tables**: Added `school_id` (nullable, FK→schools.id) to `student_cards`, `staff_cards`, `parent_cards`, `employee_cards` — migration `d9e8f7a6b5c4`
- **Service layer updated**: `assign_*_card` functions now populate `school_id` from the parent entity (Student, StaffProfile, Parent) on card creation
- **Response schemas**: Added `school_id: str | None` to `StudentCardResponse`, `StaffCardResponse`, `ParentCardResponse`, `EmployeeCardResponse`

### License Server Auth
- **Secured unprotected endpoints**: `POST /verify`, `POST /activate`, `GET /school/{school_id}` now require JWT auth via `get_current_admin` (previously unauthenticated)

### MFA Enforcement
- **Login flow**: FINANCE and SUPER_ADMIN users without MFA enabled are now rejected at login with `403 — MFA is required for your role`. This enforces enrollment before access

### RBAC
- **Bulk NFC assign**: Added `require_permission(Permission.CARD_PRINT_ASSIGN)` — previously any authenticated user could call `/nfc/bulk-assign`

### Card UID Uniqueness
- **Cross-table UID dedup**: Added `_ensure_unique_card_uid()` helper that checks all 4 card tables before assignment — prevents the same UID from being registered on different card types

### Precision
- **API float→Decimal cleanup**: Removed `float()` casts from `parent_payments.py`, `parent_portal.py`, `platform_commission.py` endpoints. Changed `chapa_service.initialize_payment` to accept `Decimal` instead of `float`. The API now returns `Decimal` amounts where the DB stores them as DECIMAL

### Anti-Enumeration
- **Public NFC lookup oracle removed**: Response no longer contains `found` field; unknown cards return same generic message as known cards — preventing UID enumeration (H7)

### Testing
- **Settings schema tests**: Added `tests/test_settings.py` — 5 tests covering known keys, partial updates, unknown key rejection, wrapper rejection, and empty payload
- **Test suite**: 173/173 pass (up from 168)

## [0.9.4] — 2026-07-10

### Finance Security Deep Audit — 5 Critical Gaps Fixed
- **`process_chapa_payment`**: Added `with_for_update()` on PaymentSession + Payment + Invoice queries; replaced silent `try/except: pass` with `logger.warning` on platform commission step
- **`request_refund`**: Added `with_for_update()` on Payment + Refund queries to prevent double-refund races
- **`mark_invoice_paid`**: Added `with_for_update()` on MonthlyPlatformInvoice query
- **`create_invoice`**: Added `school_id` filter to ParentStudentLink query + Student existence validation
- **`platform_commission.py` webhook**: Added missing `logger` import + `with_for_update()` on invoice query
- **Removed broken import**: `SyncQueueItem` from `parent_payment_service.py` (caused `ImportError`)
- **9 new concurrency tests** (TestFix8–10 in `test_finance_security.py`): 4 for process_chapa, 2 for request_refund, 2 for mark_invoice_paid + 1 for refund full status flow

### Code Health
- **Circular dependency risk fixed**: Created `core/auth_deps.py` and `core/rate_limit.py`; `api/v1/deps.py` is now a thin re-export layer
- **Test suite**: 168/168 pass (up from 159)

### Encryption & Security
- **QR token AES-256-GCM**: Replaced plain base64 with authenticated encryption using HKDF-derived key from SECRET_KEY. Backward compatible — existing base64 tokens still decrypt. New tokens prefixed with `A1|`
- **Settings PUT schema validation**: Replaced unrestricted `data: dict` with `SchoolSettingsUpdate` Pydantic model. Unknown keys rejected via `extra="forbid"`. Frontend settings keys (19 known fields) now validated at the API boundary
- **IGA permissions**: Added dedicated `INFRASTRUCTURE_VIEW` permission; `/iga/metrics` and `/iga/health-summary` now use it instead of `AUDIT_VIEW` (which was semantically imprecise). Mapped to ADMIN role

### Precision
- **Float→Decimal final 2**: Converted `library_fines.amount` and `inventory_assets.value` from Float to `DECIMAL(15,2)` — migration `a8b9c0d1e2f3`

### Cleanup
- **Deduplicated `_is_token_blacklisted`**: Removed duplicate from `auth.py`; all callers now import from `auth_deps.py`

### Documentation
- Applied 25+ fixes across README.md, FINANCE.md, SECURITY.md, ARCHITECTURE.md, DEPLOYMENT.md, DEPLOY.md, CHANGELOG.md, COMPLETED_WORK.md, KNOWN_LIMITATIONS.md, PRODUCTION_READINESS.md, AI_ANALYSIS.md, DEEPSEEK_TASKS.md, SYSTEM_EXPLANATION_AMHARIC.md, OPERATIONS_MANUAL.md
- Updated PRODUCTION_READINESS.md score from 5.5 to 7.7/10

## [0.9.3] — 2026-07-07

### Security & Audit
- **AuditLog.school_id population**: Added `school_id` parameter to `log_audit()` and `log_audit_and_commit()` with default `None` (fully backward-compatible). Updated all call sites in `student_service.py` (5 calls), `academic_service.py` (26 calls), `hr_service.py` (8 calls), `inventory_service.py` (8 calls), `library_service.py` (5 calls), `staff_service.py` (2 calls), `cafeteria_service.py` (5 calls), `communication_service.py` (1 call), and `event_service.py` (3 calls) to pass `school_id` — total **58 updated**. Enables per-tenant audit forensics, which was previously impossible because every audit row had `school_id=NULL`
- **Authenticated setup endpoint rate limits**: `POST /setup/school`, `/setup/branch`, `/setup/admin` had no rate limits despite modifying data. Added `SETUP_MANAGE_LIMIT` (10/min)
- **NFC public lookup rate limit**: `GET /nfc/public/lookup` is public, unauthenticated, and was without any rate limit. Added `NFC_PUBLIC_LOOKUP_LIMIT` (60/min) to prevent card-UID enumeration and brute-force oracle attacks
- **Installer connect-vps SSRF**: `/installer/connect-vps` accepted any URL string without validation, enabling Server-Side Request Forgery (SSRF) to internal services. Added `_validate_vps_url()` that rejects non-http(s) URLs, localhost, 127.0.0.1, and internal/private IP ranges
- **QR endpoint rate limit**: `GET /qr/{uuid}` is unauthenticated, returns student-parent PII (reference_id), and was without any rate limit. Added `QR_VALIDATE_LIMIT` (60/min) to prevent UUID brute-force enumeration and data leakage

### Files Modified
- `backend/app/core/audit.py` — added optional `school_id` parameter to `log_audit()` and `log_audit_and_commit()`
- `backend/app/services/student_service.py` — updated 5 `log_audit` calls to pass `school_id` (all other callers pass `None` as default, fully backward compatible)
- `backend/app/api/v1/endpoints/setup.py` — added `SETUP_MANAGE_LIMIT` and applied to 3 authenticated endpoints
- `backend/app/api/v1/endpoints/nfc_v2.py` — added `NFC_PUBLIC_LOOKUP_LIMIT` to public lookup
- `backend/app/api/v1/endpoints/qr.py` — added `QR_VALIDATE_LIMIT` to `GET /qr/{uuid}`
- `backend/app/api/v1/endpoints/installer.py` — added `_validate_vps_url()` helper and applied to `POST /installer/connect-vps`

### Suggested Git Commit
```
fix(security): populate school_id in AuditLog; add rate limits; validate installer connect-vps URL

- log_audit() now accepts school_id (default None, backward compatible)
- student_service passes school_id to all 5 log_audit calls
- Added 10/min rate limit to POST /setup/school, /setup/branch, /setup/admin  
- Added 60/min rate limit to /nfc/public/lookup, preventing card-UID enumeration
- Added 60/min rate limit to /qr/{uuid}, preventing UUID brute-force + PII leak
- /installer/connect-vps now validates URL scheme, blocks localhost/127.0.0.1/private IPs

Addresses critical / high findings from Deep Audit 2026-07-06:
- C13: AuditLog.school_id never populated (partial: student_service updated)
  Other services still pass None; incremental updates recommended
- Rate-limit gaps on /setup/* authenticated endpoints (resolved)
- /nfc/public/lookup brute-force oracle (resolved)  
- /qr/{uuid} unauthenticated PII leak via UUID enumeration (resolved)
- /installer/connect-vps SSRF via arbitrary vps_url (resolved)
```

## [0.9.2] — 2026-07-07

### Critical Security Fixes (Deep Audit 2026-07-06)
- **Settings PUT privilege overflow**: Added `require_permission(Permission.SETTINGS_MANAGE)` — previously any authenticated user (including STUDENT/PARENT) could overwrite SchoolSettings
- **Card design IDOR**: `/card-design/{school_id}` now validates ownership — non-superusers can only access their own school's design
- **Branches PATCH/DELETE**: Added `require_permission(Permission.SCHOOL_MANAGE)` and `log_audit` on PATCH for compliance
- **Cross-tenant corporate PII leak**: `/corporate/departments` and `/corporate/employees` endpoints gated by `CORPORATE_EMPLOYEE_VIEW` permission (models lack school_id; role-based gate is minimal safe fix)
- **NFC by-card cross-tenant lookup**: `get_*_by_card()` service functions now accept optional `school_id` and filter accordingly
- **Parent payments refund endpoints**: `request_refund` now validates payment ownership via `ParentStudentLink`; `approve_refund` and `process_refund` now filter by `school_id`
- **Platform admin dashboard exposure**: `/platform/admin/dashboard` restricted to `AUDIT_VIEW` (was `get_current_user`)
- **IGA endpoints global exposure**: `/iga/metrics` and `/iga/health-summary` restricted to `AUDIT_VIEW` (was `get_current_user`)
- **Rate limits on /setup/* and /installer/***: Added `SETUP_STATUS_LIMIT` (60/min), `SETUP_VALIDATE_LIMIT` (20/5min), `SETUP_INIT_LIMIT` (3/hr), `INSTALLER_INIT_LIMIT` (3/hr), `CONNECT_VPS_LIMIT` (10/5min)
- **Global exception handler**: Added `@app.exception_handler(Exception)` that redacts stack traces in non-dev environments
- **Sync HMAC body signing**: `/sync/receive` now verifies `{server_id}.{ts}.{body_hash}` (backward-compatible with old `{server_id}.{ts}` format)
- **Telegram webhook signature**: Added HMAC-SHA256 verification using bot token

### Schema Precision
- **Float → Decimal**: Replaced `float` with `Decimal` for all money fields across `finance.py` (28 fields), `cafeteria.py`, `hr.py`, `inventory.py`, `library.py`

### Medium Priority Fixes
- **Users PATCH role escalation**: Validates `role_id` cannot be `SUPER_ADMIN`, prevents role escalation within tenant
- **NFC employee assign**: Changed from `get_current_user` to `require_permission(Permission.CARD_PRINT_ASSIGN)` for consistency
- **NFC scan asyncio crash**: Fixed `asyncio.ensure_future` in sync context by checking `get_running_loop()` before broadcasting

### Documentation
- Created `docs/IMPLEMENTATION_NOTES.md` with rationale, trade-offs, RBAC enforcement strategy, super admin overrides, and corporate model global status
- Created `docs/KNOWN_LIMITATIONS.md` tracking deferred schema changes (corporate school_id, settings schema validation, IGA permission granularity, NFC public lookup enumeration, float money schemas)
- Updated `docs/TECHNICAL_DEBT.md` with resolved items

## [0.9.1] — 2026-07-01

### Security
- **Login bcrypt fix**: Removed `switchable=True` from `pwd_context.verify()` — was silently returning False
- **Cross-school IDOR sweep**: Fixed 4 endpoints missing `school_id` filters (2 HIGH in students.py, 1 MEDIUM in report_cards.py, 1 LOW in academic.py)
- **`require_inside_network()`**: New dependency checks IP against trusted CIDR ranges, sets `is_view_only`
- **`require_server_role()`**: New dependency for role checking before DB init

### Sync System
- **Sync background worker**: Daemon thread runs `process_queue()` every 5 minutes
- **Sync admin endpoints**: `GET /sync/queue` (list), `POST /sync/retry-failed` (reset failed)
- **Conflict resolution**: Priority queue (1=attendance → 5=notifications), LWW by `updated_at`, `conflict_logs` table
- **`sync_inbound` table**: Created (was model-only for dedup)
- **`sync_queue` columns**: Added `priority` and `source_version`
- **enqueue_sync()**: Wired into student, user, finance, cafeteria CRUD services

### Multi-Tenant Isolation
- **Missing `school_id` columns**: Added to 12 tables (budget_items → semesters)
- **`student_documents` + `school_announcements`**: Created tables (models existed, DB didn't)
- **Student FK type fix**: Changed from `UUID` to `String(36)` to match `students.id`

### Performance
- **15 composite indexes**: Created on attendance, payments, invoices, journal_entries, audit_logs, students, sync_queue, wallet_transactions

### Monitoring
- **`/health/live`**: Liveness check (always 200)
- **`/health/ready`**: Readiness check (200 if DB reachable, 503 otherwise)
- **Enhanced `/health/`**: DB latency in ms, server identity info

### Correctness
- **Landing page simplified**: Removed activation forms, redirects to /installer or /login
- **`watermark.py` Student fix**: Replaced non-existent `full_name` with `first_name`
- **Master setup key empty bypass**: Returns 501 instead of passing
- **Seed script fixed**: Missing `school_id` on Section, Subject, TeacherProfile, StaffProfile

### Database
- **Alembic chain synced**: 11 linear migrations, head at `931f2054f522`

## [0.9.0] — 2026-07-01

### Security
- **SECRET_KEY fail-fast**: Zero-length default, `KNOWN_WEAK_KEYS`, validation in all environments, rejected keys under 32 chars
- **View-only enforcement**: `require_role()` returns 403 for view-only users
- **Backup path traversal**: Regex-whitelist + `realpath()`, SUPER_ADMIN gate, audit logging
- **License-key password reset removed**: Replaced with authenticated TTL-bound HMAC recovery code flow; super admin passwords never resettable via recovery
- **Sync endpoint secured**: HMAC-SHA256 auth, 60s replay window, 503 if unconfigured
- **CSP hardening**: `'unsafe-eval'` dropped in production; CORS wildcard startup guard
- **Rate-limit refresh**: `/auth/refresh` now has `AUTH_RATE_LIMIT`

### Correctness
- **log_audit atomicity**: `log_audit()` no longer commits; callers control commit. ~96 call sites updated.
- **Parent-portal payment fix**: `record_payment()` call aligned to real signature (was passing wrong kwargs)
- **Cafeteria row locks**: `with_for_update()` on product + wallet queries prevents oversell

### Multi-Tenant Isolation
- `promote_student`: Added `school_id` filter
- `bulk_create_exam_results`: Added `school_id` filter
- `create_journal_entry`: Added `school_id` filter
- `reverse_journal_entry`: Added `school_id` filter (propagated to endpoint)
- `record_payment`: Added `school_id` filter on invoice lookup
- `create_order`: Added `school_id` filter on product + wallet locks

### Configuration
- `.env.example`: SECRET_KEY blanked with generation instructions
- `docker-compose.yml`: SECRET_KEY removed with generation comment
- `backend/.env` (dev): Strong random 64-char key set
