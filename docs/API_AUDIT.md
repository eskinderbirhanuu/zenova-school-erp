# ZENOVA — API Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Senior Backend Engineer / API Architect role
**Method:** Static analysis of all 50 endpoint files in `backend/app/api/v1/endpoints/`. No code modified.
**Scope:** Authentication coverage, IDOR, rate limiting, validation, error handling, response shape.

---

## Executive Summary

ZENOVA exposes **~320 routes** across **50 endpoint files** mounted under `/api/v1`. Authentication is enforced via FastAPI dependency injection (`get_current_user`, `require_permission`, `require_role`). Multi-tenancy is enforced in code (not RLS). The API design follows REST-ish conventions but with several **critical** authorization gaps and a **`float`-for-money contract boundary** that contradicts project rules.

| Score | Dimension | Notes |
|---|---|---|
| 75/100 | Auth coverage | 4 protected surfaces missing or weak (see §2) |
| 60/100 | Authorization | 7 cross-tenant issues (IDOR or missing perms) |
| 78/100 | Rate limiting | Global + per-endpoint; 4 sensitive surfaces un-limited |
| 55/100 | Validation | `dict` bodies + `str` email + `float` money |
| 50/100 | Error handling | No global handler; webhooks leak internal error strings |
| 80/100 | REST conventions | Predictable URLs / status codes; verbs inconsistent in places |

---

## §1 — Route Inventory

| File | Routes | Notes |
|---|---:|---|
| `finance.py` | 44 | VIEW_FINANCE / FINANCE perms throughout |
| `academic.py` | 43 | DIRECTOR_CREATE / DIRECTOR_VIEW |
| `nfc_v2.py` | 18 | require_permission STUDENT_CREATE etc. + require_licensed_feature("nfc") |
| `hr.py` | 17 | HR perms |
| `inventory.py` | 14 | INVENTORY_MANAGE |
| `students.py` | 16 | STUDENT_CREATE/EDIT/VIEW; bulk-import forces tenant |
| `auth.py` | 13 | LOGIN_RATE_LIMIT / AUTH_RATE_LIMIT |
| `licenses.py` | 13 | LICENSE_MANAGE for admin; verify public |
| `teachers.py` | 11 | teacher perms |
| `library.py` | 10 | LIBRARY_MANAGE |
| `communication.py` | 10 | ALL / MESSAGING |
| `parent_payments.py` | 10 | parent-side Chapa flows |
| `activate.py` | 10 | activate chain (rate-limited) |
| `corporate.py` | 9 | CORPORATE_EMPLOYEE_EDIT |
| `parents.py` | 9 | PARENT_CREATE/EDIT |
| `platform_commission.py` | 7 | Super-admin invoicing |
| `cafeteria.py` | 7 | CAFETERIA_POS |
| `setup.py` | 7 | Onboarding wizard — **NO rate limit** |
| `installer.py` | 6 | system installer — **NO rate limit, **SSRF (C3)** |
| `branches.py` | 5 | SCHOOL_MANAGE on create only — PATCH/DELETE missing perms |
| `sync.py` | 6 | HMAC-signed receive |
| `support_tickets.py` | 5 | user-created tickets |
| `nfc.py` | 5 | legacy NFC |
| `staff.py` | 5 | STAFF_CREATE |
| `qr.py` | 4 | public validate route |
| `dashboard.py` | 4 | role-aware |
| `events.py` | 4 | |
| `announcements.py` | 4 | |
| `archive.py` | 3 | LICENSE_MANAGE |
| `conflicts.py` | 2 | admin |
| `sequences.py` | 2 | admin |
| `audit_logs.py` | 1 | is_superuser gate |
| `metrics.py` | 1 | no auth (operational only) |
| `report_cards.py` | 3 | |
| `parent_portal.py` | 3 | parent |
| `student_portal.py` | 1 | student |
| `settings.py` | 2 | SECONDARY (PUT) only `get_current_user` — **Critical C6** |
| `setup_wizard.py`, `reports.py`, `schools.py`, `ws.py`, `scanner.py`, `iga.py`, `health.py` | ~14 total | mixed |
| **Total** | **~320** | |

---

## §2 — Authentication Coverage

### §2.1 — Unauthenticated routes (intended-public)

| Endpoint | File:Line | Verdict |
|---|---|---|
| `GET /api/v1/`, `/live`, `/ready` | `health.py:82,128,133` | OK — health probes |
| `POST /auth/login` `register` `refresh` `logout` `forgot-password` `reset-password` `mfa/login` | `auth.py:107,193,258,324,362,398,525` | OK — rate-limited |
| `GET /setup/status` `school-branding` `POST /setup/validate` `initialize` | `setup.py:29–82` | See C3 — NO rate limit |
| `GET /activate/*` `POST /activate/initialize*` `recovery/*` `verify-super-admin-contact` | `activate.py` | OK — rate-limited |
| `GET /installer/*` `POST /installer/initialize*` `connect-vps` | `installer.py:56,297,70,134,206,314` | **CRITICAL** — no rate limit; `/connect-vps` is unauth SSRF (SECURITY C3) |
| `POST /licenses/verify` | `licenses.py:37` | OK — `LICENSE_VERIFY_LIMIT` |
| `GET /nfc/public/lookup` | `nfc_v2.py:88` | See H3 — no rate limit; enumeration oracle |
| `GET /qr/{uuid}` | `qr.py:29` | See H1 — no rate limit; PII leak |
| `POST /parent-payments/chapa/webhook` | `parent_payments.py:158` | OK — HMAC verified |
| `POST /platform/invoice/webhook` | `platform_commission.py:101` | OK — HMAC verified |
| `POST /telegram/webhook/{school_id}` | `telegram.py:40` | **CRITICAL** — no signature (SECURITY C4) |
| `POST /sync/receive` | `sync.py:95` | **CRITICAL** — body not signed (SECURITY C5) |
| `GET /metrics` | `metrics.py:41` | OK — operational |

### §2.2 — Routes with auth dep but missing/mismatched permission

| Endpoint | File:Line | Issue |
|---|---|---|
| `PUT /settings` | `settings.py:25` | `get_current_user` only — student can rewrite (C6) |
| `PATCH /branches/{id}`, `DELETE /branches/{id}` | `branches.py:88,119` | `get_current_user` only; siblings have SCHOOL_MANAGE (M2) |
| `POST /nfc/employee/assign` | `nfc_v2.py:61` | Missing `STAFF_CREATE` perm siblings have (M3) |
| `GET /nfc/employee/assign`-lookups | `nfc_v2.py:111,131,150,167` | Cross-tenant by-card PII leak (H5) |
| `GET /corporate/*` (all 9 routes) | `corporate.py:*` | No `school_id` filter (H6) |
| `GET /card-design/{school_id}` `PUT /card-design/{school_id}` | `card_design.py:13,25` | Path ID, not `current_user.school_id` (H7) |
| `POST /parent-payments/refund/request` `approve` | `parent_payments.py:249,279` | No ownership check (H1, H2) |
| `GET /platform/admin/dashboard` `/reports/*` | `platform_commission.py:47,130,155,188` | Leaks cross-tenant revenue to any auth user (H8) |
| `GET /iga/metrics`, `/iga/health-summary` | `iga.py:14,23` | Leaks server topology (H9) |
| `POST /activate/employees/create` | `activate.py:251` | role_name escalation possible (H10) |
| `POST /telegram/bot/connect` `status` `disconnect` | `telegram.py:14,24,32` | No SETTINGS_MANAGE perm (M16) |
| `GET /audit-logs` | `audit_logs.py:11` | Silent empty return for non-super (M1) |

---

## §3 — IDOR Findings (cross-tenant fetch by ID)

| # | Endpoint | File:Line | Bug | Severity |
|---|---|---|---|---|
| IDOR-1 | `/corporate/employees/{emp_id}` and 8 sibling routes | `corporate.py:97–141` | No `school_id` filter; returns cross-tenant PII | **Critical** |
| IDOR-2 | `/card-design/{school_id}` `GET`+`PUT` | `card_design.py:13,25` | Trusts path `school_id`; ignores `current_user.school_id` | **High** |
| IDOR-3 | `/nfc/student/by-card/{uid}` (and staff/parent/employee variants) | `nfc_v2.py:111,131,150,167` | No school filter; returns PII (name, photo, email) | **High** |
| IDOR-4 | `/parent-payments/refund/request`, `/refund/{id}/approve` | `parent_payments.py:249,279` | No payment/refund ownership/school check | **High** |
| IDOR-5 | `/platform/admin/dashboard`, `/reports/*` | `platform_commission.py:47,130,155,188` | Returns cross-school aggregates to non-super | **High** |
| IDOR-6 | `/installer/connect-vps` | `installer.py:314` | Path-param `school_id` written to server identity; no auth | **Critical** |

Positive: students.py, finance.py, parents.py, hr.py correctly thread `current_user.school_id` end-to-end into service layer.

---

## §4 — Rate Limiting Audit

### §4.1 — Limits correctly in place

- Global `RateLimitMiddleware` (`main.py:67`): **200/min on `/api/v1/*`**, exempting health/login/refresh/activate/setup-status (11 paths).
- `LOGIN_RATE_LIMIT` 5/5min on `/auth/login`, `/auth/mfa/login`
- `AUTH_RATE_LIMIT` 10/min on `/auth/register`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`
- `LICENSE_CHECK_LIMIT` 20/5min, `ACTIVATE_INIT_LIMIT` 3/hr, `RESET_PASSWORD_LIMIT` 5/15min, `RECOVERY_ISSUE_LIMIT` 10/15min, `RECOVERY_RESET_LIMIT` 5/15min on `/activate/*` and `/auth/verify-super-admin-contact`
- `LICENSE_VERIFY_LIMIT` 20/5min on `/licenses/verify`

### §4.2 — Sensitive endpoints UN-RATE-LIMITED

| Endpoint | File:Line | Severity | Abuse vector |
|---|---|---|---|
| `/setup/validate`, `/setup/initialize`, `/setup/school-branding` | `setup.py:29–82` | **Critical** | License key brute-force / validation oracle |
| `/installer/initialize*`, `/installer/connect-vps` | `installer.py:70,134,206,314` | **Critical** | Bootstrap endpoint hammering; SSRF target recon |
| `/telegram/webhook/{school_id}` | `telegram.py:40` | **Critical** | Mute/forge webhooks, spam subscribers |
| `/qr/{uuid}` | `qr.py:29` | High | UUID leak / membership oracle |
| `/nfc/public/lookup` | `nfc_v2.py:88` | High | UID enumeration across schools |
| `/corporate/*` | `corporate.py:*` | Medium | PII pull at high volume |

### §4.3 — Recommendation

Apply the proven `LICENSE_CHECK_LIMIT` / `ACTIVATE_INIT_LIMIT` pattern to `/setup/*` and `/installer/*` (3/hr for initialize; 10/5min for validate). Add per-IP limiter on `/qr/{uuid}` and `/nfc/public/lookup` (50/day). Force Telegram to validate `X-Telegram-Bot-Api-Secret-Token`.

---

## §5 — Input Validation

### §5.1 — Schema validation that's done right

- `nfc_v2.py:58,60,77` — `card_uid` length validated, `card_tier` regex `^(standard|premium)$`, `scan_type` enum
- `auth.py:8` — `password min_length=8 max_length=128`, regex requires lower/upper/digit/symbol, blocks 6 weak defaults
- `license.py` — 25 fields with `min_length=10` and `pattern=`
- No `Any`-type usage anywhere ✓

### §5.2 — Validation gaps

| # | Issue | File | Severity |
|---|---|---|---|
| V1 | **`float` for all money** in `schemas/finance.py` (40 fields), `cafeteria.py` (3), `hr.py` (2), `inventory.py` (5), `report_card.py`, `library.py` | Violates project "Decimal for money" rule — float-Decimal round-trip erodes precision. Fix: `Decimal` annotations throughout; FastAPI/Pydantic serializes as string. | **High** |
| V2 | `InvoiceCreate.lines: list[dict]` | `schemas/finance.py:127` | Arbitrary key/value accepted — model as `list[InvoiceLineCreate]` | Medium |
| V3 | `PUT /settings` body is `dict` | `settings.py:27` | Arbitrary JSON into `SchoolSettings.settings_json` — model with Pydantic | Medium |
| V4 | `PATCH /attendance/{attendance_id}` body is `dict` | `attendance.py:126` | No value type validation — model with Pydantic | Medium |
| V5 | `POST /parent-payments/refund/request` is **bare query params** (no body schema) | `parent_payments.py:249` | `amount: float` no `> 0`; `reason: str` no max_length — model as body with `Decimal` `amount > 0` and `reason: str max_length=500` | Medium |
| V6 | `email` uses `str` not `EmailStr` despite `email-validator` in requirements | `schemas/auth.py` | No RFC validation on register / forgot-password | Medium |
| V7 | `UserUpdate.role_id` settable without ceiling | `schemas/user.py:21` | Admin can promote own tenant user to SUPER_ADMIN role_id | Medium |
| V8 | Email + name fields accept 255-char strings with no pattern | multiple | Storage abuse / error-frame injection | Low |

### §5.3 — SQL injection

`rg "text\(|\.execute\(|f\".*SELECT|INSERT|UPDATE|DELETE FROM"` returned **NO user-input into SQL** anywhere. All queries use SQLAlchemy ORM with `.filter(Model.col == value)` (parameterized). The only `text()` literals are `text("SELECT 1")` in dev-only health probes — sanitized.

**Verdict:** No SQL injection pathway. ✓

### §5.4 — Mass assignment

- `PATCH /users/{id}` uses `setattr` over `UserUpdate.model_dump(exclude_none=True)` — schema constraints prevent setting `is_superuser`, `school_id`, `hashed_password`, `email` from body. ✓
- `UserUpdate.role_id` is settable → see V7.

---

## §6 — Error Handling

| # | Issue | File | Severity |
|---|---|---|---|
| E1 | No global `@app.exception_handler(Exception)` registered | `main.py` (absent) | **Medium** — non-prod env returns full FastAPI traceback including local vars → DB URL + email + SQL fragments leak if staging reachable |
| E2 | Webhook error handlers `raise HTTPException(500, str(e))` | `parent_payments.py:194`, `platform_commission.py:127` | Medium — leaks internal Chapa service strings to anyone holding the webhook secret |
| E3 | `/installer/whoami` `connect-vps` distinguishes 404 vs 400 | `installer.py:297,314` | Medium — school-existence probing |
| E4 | `/audit-logs` returns silent empty for non-super | `audit_logs.py:11` | Low — inconsistent with other admin 403 patterns |
| E5 | `except: pass` swallow on Redis down in brute-force tracking | `auth.py:79,88,96` | Low — fail-open silent; log when Redis fails |

**`debug=True` not used in production** (`main.py:17` doesn't pass `debug=`). `uvicorn --reload` not in entrypoint. ✓

**`docs_url`/`redoc_url` set to None in production.** ✓

---

## §7 — REST Conventions

| Pattern | Adherence |
|---|---|
| HTTP verbs match action | Mostly ✓ — a few `POST /X/{id}/reset` style mutations |
| Status codes | Consistent 200/201/204/400/401/403/404/409; 500 only on errors |
| Resource URIs | `/api/v1/students`, `/parents`, `/attendance` etc. — pluralized, consistent |
| Pagination | **Inconsistent** — `?skip=&limit=` on most list endpoints, but `academic.py` list endpoints have no pagination (return full set); Excel exports load entire unbounded result set |
| Response shape | Consistent {message?, data, ...} for mutations; bare array for some list endpoints |
| Versioning | `/api/v1` prefix ✓ |
| Idempotency keys | `Payment.idempotency_key` present ✓; not on other write paths |

---

## §8 — Top Recommendations

1. **Fix all IDOR** (§3): thread `current_user.school_id` through `corporate_service`, NFC by-card lookups, card_design (use `current_user.school_id`, drop path param), `parent_payment_service.approve_refund`/`request_refund`, `/platform/*` admin routes (guard with `LICENSE_MANAGE`).
2. **Fix auth gaps** (§2.2): add `require_permission(SETTINGS_MANAGE)` to `PUT /settings`; `SCHOOL_MANAGE` to `PATCH`/`DELETE /branches/{id}`; `STAFF_CREATE` to `/nfc/employee/assign`; `LICENSE_MANAGE` to `/platform/*` and `/iga/*`.
3. **Fix rate limits** (§4.2): apply proven limiter patterns to `/setup/*`, `/installer/*`, `/qr/{uuid}`, `/nfc/public/lookup`, `/telegram/webhook/*`.
4. **Webhook signatures** (see SECURITY_AUDIT C4, C5): add Telegram secret token; extend sync HMAC to cover body.
5. **Money contract**: replace every `float` in schemas/*.py with `Decimal`.
6. **Body schemas**: replace `dict` bodies in `PUT /settings`, `PATCH /attendance/{id}`, `POST /parent-payments/refund/request`.
7. **Email validation**: change `email: str` to `EmailStr` in auth schemas (lib already in requirements).
8. **Role ceiling**: reject `SUPER_ADMIN`/`LICENSE_MANAGE` in `UserUpdate.role_id` unless caller `is_superuser`.
9. **Global exception handler**: register `@app.exception_handler(Exception)` returning `{"detail": "Internal server error"}` in non-dev env; log full traceback server-side.
10. **Pagination**: enforce max `limit` (1000) on all list endpoints; modularize Excel export to streaming response.

---

**API Score: 70/100** — deduct 20 for IDOR + missing perms on critical surfaces, 10 for rate-limit gaps + webhook auth, 0 for clean schema work and absence of SQL injection.

**End of API_AUDIT.md**
