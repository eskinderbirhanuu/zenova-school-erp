# Changelog

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
- Created `docs/IMPLEMENTATION_NOTES.md` with rationale and trade-offs for each fix
- Created `docs/ARCHITECTURE_DECISIONS.md` documenting RBAC enforcement strategy, super admin overrides, corporate model global status
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
