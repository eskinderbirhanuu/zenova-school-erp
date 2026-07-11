# 02 — BACKEND AUDIT

**Generated:** 2026-07-11  
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

The ZENOVA backend is a well-structured FastAPI monolith with 51 endpoint modules, 49 service modules, 77 models, and 28 schema packages. Architecture follows service-layer pattern with Pydantic validation, SQLAlchemy ORM, JWT auth, Redis-backed rate limiting, and a comprehensive middleware stack. Most critical issues from the prior 2026-07-06 audit have been resolved. Remaining issues are primarily about data modeling gaps and QR token integrity.

**Score:** 8.0/10

---

## Current Implementation

### Application Entry Point (`main.py`)

- FastAPI app with conditional Swagger/ReDoc (hidden in production)
- 8 middleware layers in correct order:
  1. CORSMiddleware (tight origin list, no wildcard)
  2. SecurityHeadersMiddleware (custom HSTS/CSP/XFO/XCTO/Referrer-Policy/Permissions-Policy)
  3. RateLimitMiddleware (Redis-backed per-IP)
  4. UploadLimitMiddleware
  5. MetricsMiddleware
  6. RequestLoggingMiddleware
  7. CSRFMiddleware (double-submit cookie pattern)
  8. Watermark via `@app.middleware("http")` decorator

- Global exception handler sanitizes 500s in production (no stack trace leaks)
- Startup: license validation → sync worker thread → scheduler
- Shutdown: drains sync queue → joins thread → stops scheduler → closes Redis

### REST API (51 endpoint files)

**Router tree** (from `api/v1/router.py`):
```
/api/v1/
├── /health               # Liveness
├── /auth                 # Login, register, refresh, logout, forgot/reset password, MFA
├── /licenses/*           # License CRUD + verification
├── /activate/*           # License activation + recovery
├── /setup/*              # Setup status + wizard
├── /students/*           # CRUD + enrollment
├── /parents/*            # CRUD
├── /parent-portal/*      # Parent views
├── /student-portal/*     # Student views
├── /teachers/*           # CRUD
├── /staff/*              # CRUD
├── /qr/*                 # Generate, validate, history
├── /nfc/*                # v1 (legacy) + v2 card ops
├── /nfc/v2/*             # Cards, scan, print, logs
├── /corporate/*          # Corporate employees + departments
├── /academic/*           # Classes, subjects, exams, grades
├── /finance/*            # Accounts, journals, fees, invoices, payments, wallets, scholarships
├── /parent-payments/*    # Online payments, Chapa, refunds
├── /platform/*           # Platform commission dashboard + invoice pay
├── /platform/admin/*     # Super admin revenue dashboard
├── /hr/*                 # HR, payroll, leave, recruitment
├── /inventory/*          # Inventory management
├── /library/*            # Library + fines
├── /cafeteria/*          # POS
├── /communication/*      # Announcements, notifications, messages
├── /events/*             # Calendar
├── /users/*              # User management
├── /branches/*           # Branch CRUD
├── /attendance/*         # Attendance tracking
├── /schools/*            # School management
├── /audit/*              # Audit logs
├── /support/*            # Support tickets
├── /reports/*            # Reports
├── /settings/*           # School settings
├── /dashboard/*          # Role dashboard
├── /telegram/*           # Bot connect + webhook
├── /installer/*          # Server init + VPS connect
├── /iga/*                # Platform metrics + health
├── /backup/*             # Backup CRUD + download
├── /sync/*               # Queue status + trigger + receive
├── /report-cards/*       # Report cards
├── /setup-wizard/*       # Setup wizard
├── /scanner/*            # QR scanner
├── /announcements/*      # Announcements
├── /archive/*            # Data archiving
├── /conflicts/*          # Sync conflict resolution
├── /sequences/*          # Number sequences
└── /card-design/*        # Card design templates
```

### Services (49 files)

Every endpoint has a backing service module. Services follow a consistent pattern:
- Accept `db: Session` as first argument
- Accept `school_id` for tenant isolation
- Use `log_audit()` for mutation tracking
- Use `with_for_update()` for atomic operations
- Return Pydantic models or dicts

Key service patterns observed:
- `auth_service.py` — JWT creation, user auth, role resolution, login audit logging
- `finance_service.py` — Double-entry accounting, journal entries, fee management
- `parent_payment_service.py` — Chapa integration, refunds, receipt generation
- `nfc_v2_service.py` — Card lifecycle, UID hashing, scan/assign workflow
- `license_crypto.py` — 793-line comprehensive license crypto (RSA, fingerprinting, TPM)
- `sync_service.py` — Queue-based multi-server sync with HMAC auth
- `platform_commission_service.py` — Per-transaction fee, monthly invoicing, Chapa payments

### Middleware (Detailed)

| Middleware | Implementation | Rating |
|-----------|----------------|--------|
| CORS | Tight origin list, no wildcard, `allow_credentials=True` | Good |
| SecurityHeaders | Custom `BaseHTTPMiddleware` — HSTS, CSP, XFO, XCTO, Referrer-Policy, Permissions-Policy, Cache-Control | Good |
| CSRF | Double-submit cookie pattern with exempt paths for login/register/etc. | Good |
| RateLimit | Per-IP Redis sliding window. Configurable limits per endpoint. | Good |
| UploadLimit | Size cap enforcement | Present |
| Metrics | Request metrics collection | Present |
| RequestLogging | Request/response logging | Present |
| Watermark | Forensic watermark per API response (`X-Zenova-Instance`, `X-Zenova-Build`, `X-Request-ID`) | Good |

### Database Access

- `database.py`: Single SQLAlchemy engine, session factory, FastAPI `get_db` dependency
- Soft-delete via `Query.before_compile` event listener — adds `deleted_at IS NULL` filter to all queries, strips/reapplies LIMIT/OFFSET correctly. Bypass: `.execution_options(include_deleted=True)`
- Pool: 10 connections + 20 overflow (configurable)

### Configuration

- `config.py`: Pydantic BaseSettings with ~30 config keys, validation of SECRET_KEY, known-weak-key blocklist
- `KNOWN_WEAK_KEYS` frozenset catches dev keys. Production requires >=32 chars.
- `cookie_secure` auto-enabled in production

---

## Module Ratings

| Module | Score | Notes |
|--------|-------|-------|
| Auth endpoints | 9/10 | Comprehensive: JWT + refresh rotation + MFA + brute-force + CSRF + password reset |
| Finance endpoints | 8/10 | Double-entry, DECIMAL(15,2), with_for_update locks, journal reversals |
| NFC v2 endpoints | 7/10 | Per-tenant filtering, permission-gated, UID hashing. Card tables lack school_id |
| License system | 8/10 | RSA-2048 + HW fingerprint + environment detection + offline grace. Complex but thorough |
| Installer | 8/10 | SSRF protection on VPS connect, rate-limited init, proper license binding |
| Sync | 8/10 | HMAC with body hash, backward compat, clock skew check, dedup via payload_hash + sync_inbound |
| Parent payments | 7/10 | Chapa integration with webhook sig verification, refund workflow. Amount param is `float` in endpoint (should be Decimal) |
| Platform commission | 8/10 | with_for_update() row lock, webhook signature verification, per-tenant dashboard |
| QR | 5/10 | encrypted_token is base64(JSON) — not encrypted. reference_id in cleartext. No signature validation |
| Settings | 7/10 | Simple JSON blob store. No schema validation on stored JSON |
| Card design | 8/10 | Cross-tenant guard, permission-gated PUT |
| IGA | 7/10 | Simple aggregation + health checks, permission-gated |
| Backup | 7/10 | Path traversal protected, permission-gated download, audit logged |
| Scheduler | 7/10 | APScheduler with nightly archive/backup/heartbeat/audit-zombie/deactivate-licenses/platform-invoice/tpm-refresh/grace-period-enforcement |
| Telegram | 8/10 | HMAC-SHA256 webhook verification with bot token |
| Health | 8/10 | Standard liveness/readiness |
| WebSocket | 7/10 | Present (`ws.py`) |

---

## Strengths

1. **Comprehensive middleware stack** — CORS, security headers, CSRF, rate limiting, upload limits, metrics, logging, watermarking — correctly ordered.
2. **Service-layer pattern** — Clean separation: endpoints handle HTTP concerns, services handle business logic, models handle persistence.
3. **Tenant isolation via `school_id`** — Filtered at endpoint level in most places. Superadmin bypass via `is_superuser` flag.
4. **Permission-gated endpoints** — 32 permissions, 14 roles, enforced via `require_permission()` dependency.
5. **Soft-delete everywhere** — All 77 models have `deleted_at` column. Query-level filter ensures deleted rows never appear.
6. **Audit logging** — `log_audit()` on every mutation with table, record_id, action, old/new data.
7. **Global exception sanitizer** — No stack traces leak in production.
8. **Production safety** — Swagger/ReDoc auto-hidden in production. Weak-key rejection. Cookie secure enforcement.

---

## Weaknesses

1. **QR token is not encrypted** — `encrypted_token` field name is misleading. It's base64(JSON). Reference IDs in cleartext. No HMAC/signature. Forgery is possible but limited by UUID discoverability.
2. **`float` in parent-payments endpoint** — `create_payment_session_endpoint` accepts `amount: float` (line 78 of parent_payments.py). Internally converted to `Decimal`, but Pydantic validation on `float` type loses precision.
3. **Monolith with no module-level DI container** — No dependency injection framework. Dependencies passed explicitly via `Depends()`. Works fine but could benefit from a container pattern.
4. **AMS (`Amount: float`) in payment endpoint** — Same as above: money should never be `float` anywhere.
5. **No request ID propagation across services** — `X-Request-ID` generated in middleware but not threaded through logs.
6. **21 `except Exception` clauses in `license_crypto.py`** — Acceptable for cryptographic resilience but makes debugging harder.
7. **17 `except Exception` clauses in `scheduler.py`** — Deferred maintenance risk — failures are silent.

---

## Issues

### Critical

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| C1 | QR encrypted_token is plaintext | `qr_service.py:11-19` | Function named `_generate_encrypted_token` uses `b64encode(JSON)`. `_decrypt_token` comment: "simple base64 for now". PII in cleartext on QR codes. | 
| C2 | Float money in endpoint | `parent_payments.py:78` | `amount: float` parameter. Should use `Decimal` or Pydantic `condecimal`. |

### High

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| H1 | Card tables lack school_id | models: student_card, staff_card, parent_card, employee_card | Cross-tenant UID collision possible at DB level. Hashing prevented UID enumeration but doesn't enforce isolation. |
| H2 | NFC card uniqueness is per-table only | nfc_v2_service.py | Same card_uid can exist in student_card AND staff_card simultaneously. scan_nfc returns first match (student wins). Per-tenant uniqueness NOT enforced. |

### Medium

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| M1 | ~10 audit calls still missing school_id | Various low-impact services | qr_service, communication_service, grace_period_enforcer, branches, backup, activate endpoints |
| M2 | No generic DI container | app-wide | Services instantiated ad-hoc. Harder to mock/test. |
| M3 | Money as Float in 2 model columns | `library_fine.amount`, `inventory_asset.value` | Float type instead of DECIMAL(15,2). Low risk (not payment money, just fine/asset value). |

### Low

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| L1 | `sync_inbound` lacks school_id | model | No tenant column on sync audit table — acceptable as sync is cross-server |
| L2 | `corporate_department/employee` lack school_id | model | Intentionally global corporate model — documented expectation |
| L3 | 2 `print()` calls in app/ | Unknown locations | Debug remnants — low impact |

---

## Recommended Improvements

1. **CRITICAL: Replace QR base64 with actual encryption or HMAC-signed token** — HMAC the payload with secret_key, or use Fernet symmetric encryption. Include expiry in signed payload.
2. **HIGH: Add school_id to NFC card tables** — `StudentCard`, `StaffCard`, `ParentCard`, `EmployeeCard` need `school_id` column with index. Migration needed.
3. **HIGH: Add cross-table uniqueness for card UIDs** — Per-tenant UID must be globally unique (not just per-card-type).
4. **MEDIUM: Fix float money params** — Change `amount: float` → `amount: Decimal` in parent_payments.py:78.
5. **MEDIUM: Migrate library_fine.amount and inventory_asset.value to DECIMAL(15,2)** — Simple ALTER COLUMN migration.
6. **LOW: Fill remaining audit school_id gaps** — Add `school_id=current_user.school_id` to remaining ~10 callers.
7. **LOW: Add DI container** — Consider `dependency-injector` or `punq` for cleaner service wiring.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| QR encryption | Medium | Medium — changes token format |
| Card school_id migration | Medium | Low — additive column |
| Cross-table UID uniqueness | Medium | Low — app-level enforcement |
| Float→Decimal migration | Low | Low — ALTER COLUMN |
| Audit school_id fill | Low | Low — add kwarg to 10 callers |

---

## Priority

| Priority | Item |
|----------|------|
| P0 (now) | QR encryption → HMAC-signed token |
| P0 (now) | Float money params → Decimal |
| P1 (soon) | Card tables add school_id |
| P1 (soon) | Cross-table UID uniqueness |
| P2 (later) | Float money columns → DECIMAL |
| P3 (later) | DI container, audit fill |

---

## Production Readiness: Backend

**Ready with caveats.** The backend core is robust. The QR token issue and the NFC card table school_id gap are the remaining structural concerns. Neither is a production blocker for a v1 deployment, but both need resolution before scaling to multiple tenants with real PII data.