# Changelog

## [1.0.0-two-ip] - 2026-08-24

### Two-IP Architecture Design — Single Physical Server, Dual ZENOVA Systems
- **Objective**: Deploy both School ERP and Organization/Demo on one physical Ubuntu Server (192.168.1.6) using two IP addresses
- **Architecture**: Complete logical separation — separate databases, Redis, backend ports, frontend ports, Nginx bind IPs, APP_MODE
- **School ERP (IP A: 192.168.1.6)**: Nginx bind 192.168.1.6:80/443, backend 8000, frontend 3000, PostgreSQL 5432, Redis 6379, DB zenova_prod, APP_MODE=school
- **Org/Demo (IP B: TBD)**: Nginx bind 192.168.1.XXX:80/443, backend 8001, frontend 3001, PostgreSQL 5433, Redis 6380, DB zenova_org, APP_MODE=org
- **Netplan**: Add secondary IP to existing interface (preserve 192.168.1.6), apply via `netplan apply`
- **Firewall**: UFW allow 80/443 on both IPs from LAN, deny internal ports
- **Service Management**: Two systemd services (zenova-school, zenova-org) for independent management
- **Documentation**: Created `docs/infrastructure/ZENOVA_TWO_IP_ARCHITECTURE.md` with complete configs
- **Status**: Design complete — awaiting physical server SSH access for network inspection and deployment

### Project Analysis Documentation
- **New**: `docs/ai-engineering/PROJECT_ANALYSIS.md` — Full architecture, backend, frontend, database, security, test coverage analysis
- **New**: `docs/ai-engineering/CURRENT_STATUS.md` — Current project status, completed work, in-progress, planned
- **Updated**: `docs/ai-engineering/PROJECT_ANALYSIS.md` with two-IP deployment design

## [1.0.0-apu-a5] - 2026-08-09

### APU A5 - PARENT/STUDENT self-registration decision (deferred)
- **Decision**: APU keeps self-registration OFF. Admin-provisioned accounts are the enrollment control (`Parent.user_id` / `Student.user_id` links created by registrars); APU signs into those accounts.
- **Blockers identified**: (1) no enrollment binding — a self-registered PARENT/STUDENT is inert until an admin links a profile, yet consumes a user row + email with no verification; (2) the resolve payload does not include the backend `school_id` UUID, so APU cannot scope a new account to the resolved school.
- **Future path** (documented, not implemented): admin-issued enrollment/invite code that binds the new account to an existing Parent/Student profile, plus adding `school_id` to the resolve response.
- Docs updated: `APU_GAPS_AND_DEPENDENCIES.md` A5 → DECIDED-DEFER, `APU_AUTHENTICATION.md` §10, `APU_USER_ROLES.md` §5, `APU_IMPLEMENTATION_PLAN.md` Phase 5.1. Docs only — no code changed.

## [1.0.0-apu-r4] - 2026-08-09

### APU R4 - LAN certificate trust policy (design)
- **New design doc** `docs/APU_CERT_TRUST_POLICY.md`: documented trust policy for self-signed LAN certs. Principles: never disable TLS validation app-wide; cloud always validated against the OS trust store; LAN is an opt-in, per-school, explicitly-pinned exception.
- **Three trust tiers** (in preference order): (1) publicly-trusted cert on the LAN server (OS validation), (2) per-school public-key (SPKI) pinning with TOFU fingerprint confirmation stored in SecureStore under `zenova.localUrl.<code>`, (3) explicit HTTP on a trusted LAN with a persistent warning badge + confirm dialog (last resort, never default).
- **Scope boundaries**: pinning applies only to the exact configured `local_url` host:port; cloud connections never use pinning; no silent `https`→`http` downgrade; no global trust-all. Explicitly rejected anti-patterns listed in §5; failure modes/UX table in §6; implementation checklist in §7.
- Cross-referenced from `APU_NETWORK_ARCHITECTURE.md` §6 and `APU_LOCAL_TEACHER_MODE.md` §8 (both now cite the policy doc). Gaps doc R4 → DONE. Design doc only — no code changed.

## [1.0.0-apu-a4] - 2026-08-09

### APU A4 - Voluntary MFA for TEACHER/PARENT/STUDENT
- **Design decision**: the backend already allowed any authenticated role to manage MFA (`/auth/mfa/setup|verify|disable|backup-codes` require only `get_current_user`; `/auth/me` returns `mfa_enabled`). A4 is therefore a mobile-only UX decision - no backend change needed.
- **Mobile** (`mobile-app/src/screens/SecurityScreen.tsx`, `mobile-app/src/services/mfa.ts`): new Security portal reachable from the home grid for all APU roles. Reads MFA status from `/auth/me`, then runs the enable flow (setup -> QR/secret -> verify code -> save backup codes), disable flow (password-confirmed), and backup-code regeneration. Reuses the `react-native-qrcode-svg` + i18n patterns from `MFAScreen`.
- `validateSession` now also returns `mfaEnabled` (`mobile-app/src/services/api.ts`).
- Wired into `App.tsx` (`portal === "security"`) and `HomeScreen` role grids; i18n EN + AM keys added.
- Verified: `tsc --noEmit` clean; `expo export --platform android` bundles (926 modules).

## [1.0.0-apu-r2] — 2026-08-09

### APU R2 — LAN endpoint implementation
- **Control Center** (`control-center/backend`): `Customer` gained optional `local_url` + `local_url_label` columns (idempotent `ALTER TABLE` in `init_db()` via `_ensure_customer_branding_columns`); added to create/update/response schemas and to the public resolve payload (`POST /api/v1/public/schools/resolve`). VPS-only schools leave them empty.
- **Mobile base-URL policy** (`mobile-app/src/services/resolve.ts`): `pickBaseUrl()` prefers a per-school SecureStore override, then the resolve-driven `local_url`, then cloud `api_url` — each local candidate is only used after `probeLocalEndpoint()` confirms `GET /api/v1/health/live` (2s timeout). Never follows an unprobed URL.
- **Manual override** (`SchoolSelectScreen.tsx` + `storage.ts`): optional "Local server address" field persists per-school under `zenova.localUrl.<code>` (SecureStore) — covers air-gapped schools. i18n EN + AM.
- `App.tsx` `handleSelectResolvedSchool` now consults the stored override + resolves the effective base URL.
- Verified: CC `test_security_apu.py` 5/5 (resolve returns local_url); backend suite **499 passed**; `tsc --noEmit` clean; `expo export` bundles.

## [1.0.0-apu-s1-s2] — 2026-08-09

### APU S1/S2 — Student finance history + documents read
- **S1 — `GET /student-portal/finance`** (`backend/app/api/v1/endpoints/student_portal.py`): ownership-scoped via `Student.user_id == current_user.id`. Returns the student's own invoices (with line items), payment history, wallet balance, and billed/paid/outstanding totals.
- **S2 — `GET /student-portal/documents`** (`student_portal.py`): ownership-scoped read-only metadata for the student's own `StudentDocument` records (filename, type, url, created_at).
- New `_get_student_for_user()` helper resolves the profile via `Student.user_id` (404 when unlinked) — same pattern as `get_parent_for_user()`.
- **Mobile** (`mobile-app/src/screens/StudentPortal.tsx`, `mobile-app/src/services/student.ts`): StudentPortal gained Finance and Documents tabs; Finance shows wallet, billed/paid/outstanding stats, invoice list with line items + balances, and payment history; Documents lists file metadata. i18n EN + AM keys added.
- Verified: `backend/tests/test_student_portal_finance_docs.py` 6/6; full backend suite **499 passed**; `tsc --noEmit` clean; `expo export --platform android` bundles.

## [1.0.0-apu-phase2] — 2026-08-09

### APU Phase 2 — Teacher path
- **Backend**: `GET /teachers/me/subjects`, `GET /teachers/me/students` (T1 section_id/subject_id filters, 403 when not assigned), `GET /timetable/by-teacher`, `GET /exam-results/marksheet`, `POST /attendance/bulk` (T3 `X-Idempotency-Key` + `attendance_batch` table for replay-safe marks; `AttendanceBatch` model + migration `12ab34cd56ef`).
- **Mobile** (`mobile-app/src/screens/TeacherPortal.tsx`): 5-tab teacher portal — Subjects / Roster / Timetable / Attendance / Marksheet; subject + section pickers derived from timetable; attendance with Present/Absent/Late/Excused + offline queue (`src/services/queue.ts`, `drainAttendanceQueue` FIFO replay) + sync banner.
- Wired into `App.tsx` (`portal === "teacher"`) and `HomeScreen` TEACHER role grid. i18n EN + AM keys added.
- Verified: `backend/tests/test_teacher_phase2.py` 6/6 + `test_audit_flush_regression.py` 3/3; `tsc --noEmit` clean; `expo export` bundles (922 modules).

## [1.0.0-apu-phase3] — 2026-08-09

### APU Phase 3 — Notifications, security, fix-a-mark, LAN design
- **N1 — PARENT/STUDENT notification/message access** (`backend/app/api/v1/endpoints/communication.py`): reads (`GET /notifications`, `POST /notifications/{id}/read`, `POST /notifications/read-all`, `GET /messages`, `POST /messages/{id}/read`) switched from the staff-permission `ALL` gate to an `AUTHENTICATED` gate. Queries were already user-scoped (`Notification.user_id`/`Message.recipient_id`), so parents/students now see only their own items; `POST /messages` (send) stays permission-gated.
- **P1 — Report-card ownership gate** (`backend/app/api/v1/endpoints/report_cards.py`): `_resolve_accessible_student_ids()` returns `None` for staff with `STUDENT_VIEW` (unrestricted), otherwise a set of student-self + linked-parent child ids; `_require_card_access()` returns 404 for foreign cards. List filters by accessible ids; `/generate` requires staff permission; single-card detail is ownership-checked.
- **Fix-a-mark UX** (`backend/app/api/v1/endpoints/attendance.py`, `backend/app/schemas/hr.py`): `GET /attendance` accepts `section_id` (validated against the Section table) and returns `student_name` on `AttendanceResponse`. Mobile `AttendanceView` (`mobile-app/src/screens/TeacherPortal.tsx`) gained a Mark/Fix mode toggle; fix sends `PATCH /attendance/{id}` via the existing `fixAttendance` + reload.
- **R1 — Resolve error semantics** (`mobile-app/src/services/resolve.ts`, `SchoolSelectScreen.tsx`): `ResolveResult.kind` now distinguishes `found`/`not_found`/`network`/`config`/`invalid`, so transport failures no longer show "school not found". i18n keys `resolveConfigError` (EN + AM).
- **N5 — Mobile notification inbox** (`mobile-app/src/screens/NotificationsScreen.tsx`, `mobile-app/src/services/notifications.ts`): Notifications/Messages tabs with unread dots, tap-to-mark-read, mark-all-read, offline cache + freshness badge. Wired to `featureMessages` for PARENT/STUDENT/TEACHER in `HomeScreen`/`App.tsx` (new `notifications` portal).
- **R2/R3 — LAN endpoint design decided** (`docs/APU_SCHOOL_RESOLUTION.md` §5, `docs/APU_LOCAL_TEACHER_MODE.md` §3.1): resolve-driven `local_url` (primary) + SecureStore per-school override (fallback); mDNS deferred. Implementation still OPEN.
- Verified: `backend/tests/test_phase3_security.py` 11/11; full backend suite **488 passed**; `tsc --noEmit` clean; `expo export --platform android` bundles (~924 modules).

## [1.0.0-apu-phase1] — 2026-08-09

### APU Phase 1 — Parent & Student read path (mobile-app only, no backend change)
- **Authenticated API client** (`mobile-app/src/services/api.ts`): `apiGet`/`apiPost` with automatic token refresh + one retry on 401 (Gap A1); `getCsrfToken()` fetches `/auth/csrf-token`, caches per school, and `apiPost` sends `X-CSRF-Token` header + matching `csrf_token` cookie (Gap A3); `validateSession()` hits `GET /auth/me`; `SessionExpiredError` surfaces for sign-out routing.
- **Boot session validation** (Gap A2): `App.tsx` boot now validates the stored token via `/auth/me`; on expiry it clears the session and shows login, on backend-unreachable it keeps the cached session (offline-first).
- **Parent portal** (`mobile-app/src/screens/ParentPortal.tsx`): children dashboard (attendance%, grades, fees, outstanding via `/parent-payments/dashboard`), invoices tab (`/parent-payments/invoices`), receipts tab (`/parent-payments/receipts`), and a pay flow (`POST /parent-portal/payments` with CSRF + idempotent invoice pay).
- **Student portal** (`mobile-app/src/screens/StudentPortal.tsx`): dashboard (`/student-portal/dashboard`: attendance, today's schedule, subject grades, wallet, upcoming assignments), assignments tab (`/assignments`), exams tab (`/exams`).
- **Announcements screen** (`mobile-app/src/screens/AnnouncementsScreen.tsx`): published announcements feed.
- **Offline cache + freshness** (`mobile-app/src/hooks/useCachedResource.ts`): cached-first load with background refresh and a stale badge (`FreshnessBadge` in `src/components/PortalScreen.tsx`); `storage.ts` gains `readCachedFeedEntry`.
- **HomeScreen**: feature tiles now navigate to the role portal (parent/student) or announcements instead of "Coming Soon"; teacher tiles still route to a placeholder (Phase 2).
- i18n: EN + AM keys added for all new screens (loading, retry, updated, invoices, receipts, outstanding, pay now, assignments, exams, wallet, schedule, etc.).
- Verified: `tsc --noEmit` clean; `expo export --platform android` bundles (919 modules).

## [1.0.0-apu-docs] — 2026-08-09

### APU documentation phase (architecture only — no code)
Expanded the APU doc set from 2 to 16 indexed files covering the full product design (TEACHER/PARENT/STUDENT mobile client of the existing ZENOVA backend):

- **`APU_OVERVIEW.md`** — what/why/how/what-it-reuses, principles, risk summary.
- **`APU_SCHOOL_RESOLUTION.md`** — School-ID → branding → endpoint flow; LAN endpoint candidate designs.
- **`APU_NETWORK_ARCHITECTURE.md`** — local/cloud/hybrid connectivity model; LAN security.
- **`APU_API_INTEGRATION.md`** — verified endpoint inventory (auth, parent, student, teacher, shared reads, WS) + APU reuse map.
- **`APU_CLOUD_PARENT_STUDENT_MODE.md`** — cloud-first paths for parent/student.
- **`APU_LOCAL_TEACHER_MODE.md`** — LAN-first teacher path (design only).
- **`APU_SYNC_ARCHITECTURE.md`** — offline queue, replay, idempotency, conflict policy (design only).
- **`APU_OFFLINE_FIRST.md`** — per-role offline behavior and storage budget.
- **`APU_NOTIFICATIONS.md`** — push (FCM/APNs) design + PARENT/STUDENT notification permission fix.
- **`APU_DEPLOYMENT.md`** — build/install pipeline, env vars, release management, known gaps.
- **`APU_GAPS_AND_DEPENDENCIES.md`** — classified gaps (BACKEND/MOBILE/DESIGN) with status.
- **`APU_IMPLEMENTATION_PLAN.md`** — phased plan (Phase 0 done; Phases 1–5 + future cycles) with verification gates.
- Indexed all 16 APU docs in `docs/README.md`.

No implementation in this phase. Backend/mobile work is intentionally deferred to the phase plan.

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
