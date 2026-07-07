# ZENOVA — Enterprise Security Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 (Z-Ai) — Senior Security Engineer / Penetration Tester role
**Method:** Static analysis of source on disk. No code was modified. No runtime exploitation.
**Scope:** Full project — backend, frontend, license-server, docker, k8s, nginx, deploy, scripts.

> **Note on prior audits:** Earlier analyses exist at `docs/SECURITY_AUDIT_2026-06-30_GLM.md` (GLM) and `docs/audit/02_SECURITY_GAPS.md` (Copilot/kimi). This report supersedes both. Findings verified against the current codebase on 2026-07-06.

---

## Executive Summary

The ZENOVA codebase shows strong **structural** security investment (bcrypt 12, JWT type enforcement, CSRF middleware, brute-force protection, MFA, soft-delete, audit logging, license anti-tampering C extension, RSA-PSS .lic files, security-headers middleware, rate limiting). However, several **critical** authorization gaps remain — the most severe being **unauthenticated license minting and PII exposure on the cloud license-server**, an **unauthenticated SSRF endpoint** on the school installer, and **missing tenant filters on cross-tenant NFC, corporate, and refund endpoints**.

There are **7 Critical** and **11 High** findings that must be closed before any production deployment to thousands of schools.

---

## Severity Legend

- **Critical** — Internet-exploitable, leads to data breach, account takeover, privilege escalation, or system compromise.
- **High** — Authenticated-attacker-exploitable, leads to cross-tenant data leak or forgeable integrity tokens.
- **Medium** — Defense-in-depth failure or short-term risk in hardened environments.
- **Low** — Code-smell / hardening opportunity.

---

## §1 — Critical Findings

### C1. License-server issues keys and PII with no authentication
**Severity:** Critical
**File:** `license-server/app/api/v1/endpoints/licenses.py:44`; `license-server/app/api/v1/endpoints/admin.py:12`; `license-server/app/api/v1/endpoints/auth.py:42`

The cloud license-server exposes:

```python
@router.post("/generate")                # NO Depends(get_current_user)
def generate(data: LicenseKeyGenerate, db: Session = Depends(get_db)):
    lic = create_license(db, data.school_id, data.license_type,
                         data.valid_until, data.max_users, data.max_branches)
    return {"key": lic.key, "id": lic.id, ...}      # unlimited free license keys
```

- `POST /api/v1/license/generate` — mints an unlimited number of license keys with arbitrary `max_users`/`max_branches`. No auth dependency declared.
- `POST /api/v1/license/verify` and `/activate` — public by design (called by school servers), acceptable.
- `GET /api/v1/admin/dashboard` — **unauthenticated PII dump** of every school + every license.
- `GET /api/v1/schools/*` — same, no auth.
- **`POST /api/v1/auth/school/login`** — `auth.py:42-49` accepts any email that exists in the `schools` table with **no password check**. Any school's email → valid JWT.

**Risk:** Anyone on the internet who can reach the license-server URL (`https://superadmin.free.nf` per `backend/app/config.py`) can mint unlimited licenses for any school (free piracy, bypass of the entire paid licensing model), enumerate all customer schools and their contact details (mass PII disclosure / competitor intel), and impersonate any school in API calls. This single flaw **voids the anti-piracy investment** made on the school side (`license_crypto.py`, `coreval.pyd`, RSA-PSS).

**Recommendation:**
1. Add `Depends(require_super_admin)` to `/license/generate`, `/admin/dashboard`, `/schools/*`.
2. Delete or rewrite `/auth/school/login` — require real password (bcrypt-hashed) per school record, DO NOT trust email-only.
3. Add a per-IP rate limit (10/min) on `/license/verify` and `/activate` (currently unlimited).
4. Lock down CORS (see C2).

---

### C2. License-server CORS `*` + credentials — spec violation
**Severity:** Critical
**File:** `license-server/app/main.py:18-23`

```python
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True, ...)
```

The CORS spec **forbids** `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true`. Browsers reject credentialed cross-origin requests with a wildcard origin. Worse, if the middleware falls through to reflecting the request Origin header (which some FastAPI/Starlette versions do when `allow_origins=["*"]` and credentials are true), any malicious site a cloud-admin visits can issue credentialed requests to the license-server and read the responses.

**Risk:** enables cross-site attacks against a logged-in cloud admin (CSRF-to-data-exfil on `/admin/dashboard`).

**Recommendation:** `allow_origins=[<explicit admin UI origin>]`; `allow_credentials=True` only if needed.

---

### C3. Unauthenticated SSRF on `/installer/connect-vps`
**Severity:** Critical
**File:** `backend/app/api/v1/endpoints/installer.py:314`

```python
@router.post("/installer/connect-vps", response_model=ConnectVpsResponse)
def connect_vps(data: ConnectVpsRequest, db: Session = Depends(get_db)):
    # no Depends(get_current_user), no rate limit
    server_ident.vps_url = data.vps_url        # arbitrary URL written to server identity
    server_ident.sync_enabled = True
    db.commit()
```

- No `Depends(get_current_user)` — anyone who can reach the school's HTTP port can call it.
- `data.vps_url` is attacker-supplied and written verbatim to `ServerIdentity.vps_url`. After this, the school's sync worker will POST its data (HMAC-signed, but the contents include student/finance records) to an attacker-controlled listener.
- No rate limit; `/installer/initialize-super-admin`, `/initialize-main`, `/initialize-branch` also unauthenticated.

**Risk:** A single unauthenticated POST redirects all of a school's outbound sync data to an attacker's server (data exfiltration), and can be repeated to flip the destination on every compromised school. Combined with the silent-failure sync worker (H3 below), this is a long-lived exfil channel.

**Recommendation:**
1. Require `Depends(require_server_role("INSTALLER"))` (the bootstrap role stored in `server_id.json`).
2. Validate `data.vps_url` against an HTTPS allowlist or require it match the configured cloud URL from `settings.license_server_url`.
3. Add `LICENSE_CHECK_LIMIT`-style rate limit (3/hr).
4. Audit-log every write to `vps_url`.
5. Treat the `/installer/initialize-super-admin`/`initialize-main`/`initialize-branch` paths the same way — they should only function while a one-time bootstrap token is active.

---

### C4. Telegram webhook accepts arbitrary payload — no signature
**Severity:** Critical
**File:** `backend/app/api/v1/endpoints/telegram.py:40`

```python
@router.post("/telegram/webhook/{school_id}")
async def telegram_webhook(school_id, payload: dict, db: Session = Depends(get_db)):
    await telegram_bot_service.handle_webhook(db, school_id, payload)   # no signature check
    return {"ok": True}
```

No `X-Telegram-Bot-Api-Secret-Token` header verification, no IP allowlist for Telegram ranges, no HMAC.

**Risk:** Anyone on the internet can POST as if they were Telegram delivering a webhook — forge notifications, spam users via the bot, set arbitrary preferences, possibly drive the bot to take privileged actions such as broadcasting to all subscribers of a school.

**Recommendation:** Require `X-Telegram-Bot-Api-Secret-Token` header constant-time-compare to per-school secret stored at `connect_bot` time (Telegram supports a `secret_token` in `setWebhook`). Reject mismatches with 401.

---

### C5. `/sync/receive` body not HMAC-signed — replay/injection
**Severity:** Critical
**File:** `backend/app/api/v1/endpoints/sync.py:95` + `backend/app/services/sync_service.py`

The HMAC signature currently covers `f"{server_id}.{sync_ts}"` — **not the request body**. An attacker who can construct a valid `(server_id, sync_ts)` pair (e.g. by capturing one school's outbound sync and replaying with a different payload) can inject arbitrary student/finance records, or replay old payloads indefinitely.

Per the prior GLM audit (`SECURITY_AUDIT_2026-06-30_GLM.md §1`) the original `/sync/receive` was a no-op echo; the current implementation now applies the payload. The signature gap is now exploitable.

**Risk:** Remote data poisoning / record injection into a school's DB by anyone who can capture one legitimate sync envelope.

**Recommendation:** Extend HMAC message to `f"{server_id}.{sync_ts}.{sha256(body_bytes)}"`; verify `X-Zenova-Sync-Sig` constant-time; enforce ±60s replay window on `X-Zenova-Sync-Ts`.

---

### C6. `/settings` writable by ANY authenticated user (no permission check)
**Severity:** Critical
**File:** `backend/app/api/v1/endpoints/settings.py:25-42`

```python
@router.put("/settings")
def update_settings(
    data: dict,                                              # unvalidated dict
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),          # ANY logged-in user
):
    settings.settings_json = json.dumps(data.get("settings", data))
```

- No `require_permission(Permission.SETTINGS_MANAGE)` — STUDENT, PARENT, TEACHER, anyone authenticated can rewrite their school's settings JSON.
- Body is `dict` with no Pydantic model — any JSON accepted.
- No `log_audit` call on the write.

**Risk:** A student can alter school-wide configuration (e.g. toggle fee reminders off, change notification channels, suppress audit alerts) and there is no audit trail.

**Recommendation:** Add `current_user: User = require_permission(Permission.SETTINGS_MANAGE)` and a typed Pydantic schema; call `log_audit(action="SETTINGS_UPDATED")`.

---

### C7. NFC card UIDs stored in plaintext + cross-table collisions
**Severity:** Critical
**Files:** `backend/app/models/student_card.py:12`, `staff_card.py`, `parent_card.py`, `employee_card.py`; `backend/app/services/nfc_v2_service.py:108-119`

- `card_uid = Column(String(100), unique=True)` — **plaintext**, no SHA-256, no salt. A $10 NFC reader can clone any Mifare Classic card by reading the UID and writing it to a blank clone.
- Uniqueness is **per-table**: the same `card_uid` can legally exist in `student_cards` AND `staff_cards` AND `parent_cards` AND `employee_cards`. `scan_nfc` queries them in sequence and returns the first match — silent cross-type collision.
- No nonce, no challenge-response, no rolling code. UID replayed forever.
- `public_lookup_card` (`nfc_v2.py:88`) confirms membership oracle — enumerates which UIDs are registered to which school.

**Risk:** Attendance spoofing (a student can clone a teacher's card and mark themselves present), wallet tap abuse, building access bypass. Cheap, offline-clonable cards defeat the entire NFC attendance use case.

**Recommendation:**
1. Store `card_uid_hash = sha256(salt + uid)`; never persist the raw UID. Keep `card_uid_truncated` (last 4 chars) only for human display.
2. Add a cross-table unique constraint — or unify all cards into a single `cards` table with `card_type` discriminator.
3. Use **card APDU challenge-response** (Mifare DESFire EV2/EV3 supports mutual auth) instead of UID-as-identity. Reject Mifare Classic for new deployments.
4. Add per-IP rate limit on `/nfc/public/lookup` (50/day) and remove the school-name from the response.

---

## §2 — High Findings

### H1. `/parent-payments/refund/{id}/approve` no school_id check
**Severity:** High
**File:** `backend/app/api/v1/endpoints/parent_payments.py:279`; `backend/app/services/parent_payment_service.py:455`

`approve_refund` fetches `Refund.id == refund_id` with no `school_id` filter. A FINANCE user in school A can approve refunds in school B.

### H2. `/parent-payments/refund/request` no ownership check
**Severity:** High
**File:** `parent_payments.py:249`; `parent_payment_service.py:421`

`request_refund` looks up `Payment.id == payment_id` with no check that the payment belongs to `current_user.parent_id` or `current_user.school_id`. Any parent can request a refund against any payment in any school.

### H3. `/qr/{uuid}` unauthenticated + returns reference_id (PII)
**Severity:** High
**File:** `backend/app/api/v1/endpoints/qr.py:29`

```python
@router.get("/qr/{uuid}", response_model=QRValidateResponse)
def validate_qr(uuid: str, db: Session = Depends(get_db)):   # no current_user, no rate limit
    result = qr_service.validate_qr(db, uuid)
```

Returns `{reference_type, reference_id}` — student/parent/staff internal UUIDs. UUIDs are 128-bit so brute-force is impractical, but a single leaked QR code (e.g. photographed, scraped from printed card) becomes a permanent PII lookup endpoint.

### H4. QR `_generate_encrypted_token` is plaintext base64 — name lies to reviewers
**Severity:** High
**File:** `backend/app/services/qr_service.py:11-19`

The function is named `_generate_encrypted_token` and the column is `encrypted_token`, but the body is `b64encode(json.dumps(payload))` — **not encrypted, not signed**. Anyone decoding the QR sees `{type, id, nonce, ts}` in cleartext.

Forgery is partially mitigated because `validate_qr` looks the QR up by `uuid` (not by claims), but an attacker who obtains a valid `qr.uuid` (via `GET /qr/reference/{type}/{id}` which DOES require auth) can replay or impersonate.

**Fix:** rename to `generate_qr_payload`; sign with HMAC-SHA256(`settings.secret_key`, json) and embed the signature in the payload; reject payloads whose signature doesn't verify.

### H5. `/nfc/{student|staff|parent|employee}/by-card/{card_uid}` cross-tenant PII leak
**Severity:** High
**File:** `backend/app/api/v1/endpoints/nfc_v2.py:111,131,150,167`; `nfc_v2_service.py:206-220`

```python
def get_student_by_card(db, card_uid):
    return db.query(StudentCard).filter(StudentCard.card_uid == card_uid).first()
    # no Student.school_id == current_user.school_id join
```

Returns `full_name`, `photo_url`, `email`, `phone_1`, `department` for any card UID cross-tenant. Combined with the public lookup oracle (C7), this is a tenant-spanning PII disclosure path.

### H6. `/corporate/*` has no `school_id` filter — cross-tenant PII & mutations
**Severity:** High
**File:** `backend/app/api/v1/endpoints/corporate.py:97`; `backend/app/services/corporate_service.py:60,113,133,145`

`CorporateDepartment` and `CorporateEmployee` models have **no `school_id` column**. Any authenticated user in any tenant can list/read/update/delete every department and employee across the entire ZENOVA install. Returns names, emails, phones.

**Note:** "corporate" is the ZENOVA internal corporate team (ZENOVA_CORPORATE_ADMIN role), so this may be intentional cross-tenant scope; however the endpoints currently accept any auth'd user, not just `ZENOVA_CORPORATE_ADMIN`. Tighten with `require_permission(Permission.CORPORATE_EMPLOYEE_EDIT)` and `require_role("ZENOVA_CORPORATE_ADMIN")`.

### H7. `/card-design/{school_id}` path-parameter IDOR
**Severity:** High
**File:** `backend/app/api/v1/endpoints/card_design.py:13,25`

```python
@router.get("/card-design/{school_id}")
def get_card_design(school_id: str, ..., current_user = Depends(get_current_user)):
    settings = db.query(CardDesign).filter(CardDesign.school_id == school_id).first()
```

Trusts the path `school_id`, ignores `current_user.school_id`. Any authenticated user can read or overwrite any school's card design.

### H8. `/platform/admin/dashboard` and `/platform/reports/*` leak tenant revenue
**Severity:** High
**File:** `backend/app/api/v1/endpoints/platform_commission.py:47,130,155,188`

Only `Depends(get_current_user)`. Any authenticated user in any school sees platform-wide aggregate revenue across all schools — a major business-confidentiality breach for a multi-tenant SaaS.

### H9. `/iga/metrics` and `/iga/health-summary` leak server topology
**Severity:** High
**File:** `backend/app/api/v1/endpoints/iga.py:14,23`

Any auth user sees the global IGA stats and full `ServerIdentity` topology (server_id, role, vps_url, sync_enabled). Restrict to `SUPER_ADMIN`.

### H10. `/activate/employees/create` allows role escalation to SUPER_ADMIN scope
**Severity:** High
**File:** `backend/app/api/v1/endpoints/activate.py:251`

A director can create a User and pass `role_name="SUPER_ADMIN"` — no ceiling check on role name. The created `User.is_superuser` is never set True here, but `require_permission` returns True for the SUPER_ADMIN role regardless of `is_superuser`. Effective privilege escalation.

### H11. Cloud license key entropy is 64-bit, not 256-bit
**Severity:** High (anti-piracy)
**File:** `license-server/app/services/license_service.py:13`

Cloud-server `generate_license_key` uses `sha256(school_id:type:uuid4:ts)[:16]` = **64-bit security**. Local `generate_license_key_v2` uses 32 random bytes = 256-bit. Keys minted by the cloud server are 2^192× easier to brute-force than keys minted locally.

---

## §3 — Medium Findings

| # | Title | File | Risk |
|---|---|---|---|
| M1 | `/audit-logs` silently returns `{logs:[], total:0}` for non-superusers | `audit_logs.py:11` | Leaks that caller is not super; inconsistent 403 behavior |
| M2 | `/branches/{id}` PATCH and DELETE lack `require_permission(SCHOOL_MANAGE)` | `branches.py:88,119` | Any auth'd user manipulates branches |
| M3 | `/nfc/employee/assign` lacks `require_permission` (siblings have it) | `nfc_v2.py:61` | Inconsistent — anyone auth'd assigns employee cards |
| M4 | `/nfc/card/{type}/{id}/status` status from query param, no validation | `nfc_v2.py:186` | No allow-list of values; allows direct status flips |
| M5 | `UserUpdate.role_id` settable without `is_superuser` cap | `users.py:46` | Admin can promote to `SUPER_ADMIN` role_id within own school |
| M6 | `email` fields use `str` not `EmailStr` despite `email-validator` in deps | `schemas/auth.py` | No RFC validation of email format on register/reset |
| M7 | `InvoiceCreate.lines: list[dict]` — no schema on invoice line shape | `schemas/finance.py:127` | Arbitrary key/value accepted |
| M8 | `float` used for all money in `schemas/finance.py`, `cafeteria.py`, `hr.py`, `inventory.py`, `report_card.py`, `library.py` | multiple | Violates project rule "Decimal for money, never float" — float round-trip erodes financial precision |
| M9 | Float money columns in DB: `library_fine.amount`, `inventory_asset.value`, `Subscription.amount` | 3 model columns | Float stored to DB for money — currency rounding errors compound |
| M10 | Backups default to plaintext (encryption disabled) | `backup_service.py:64`, `.env.example` | Stolen backup file = full DB disclosure |
| M11 | Webhook error handlers return `HTTPException(500, str(e))` | `parent_payments.py:194`, `platform_commission.py:127` | Internal Chapa strings leak to whoever holds webhook secret |
| M12 | `/invite/whoami` and `/installer/connect-vps` reveal existence of school_id | `installer.py:297,314` |school-existence probing |
| M13 | No global exception handler — non-prod env returns full FastAPI traceback | `main.py` (absent) | Staging leaks DB URL + SQL fragments + emails on errors |
| M14 | `Recovery code issue` action not audited | `activate.py:295` | Forensics blind to who issued codes |
| M15 | `QRCode.expires_at` nullable — QRs can be issued forever | `qr_code.py:20` | Permanent PII lookup tokens |
| M16 | Telegram `connect_bot` (`telegram.py:14`) has no `require_permission` | `telegram.py:14-37` | Any auth'd user connects the school's Telegram bot |

---

## §4 — Low Findings (defense in depth)

| # | Title | File |
|---|---|---|
| L1 | Brute-force tracking silently `fail open` if Redis down — no log warning | `auth.py:79,88,96` |
| L2 | Document upload `upload_student_document` no MIME / size / extension whitelist | `students.py:372` |
| L3 | `parse_excel` uses `endswith((".xlsx",".xls"))` only — no magic byte check | `utils/excel.py:9` |
| L4 | No FK index on `parent_student_link.student_id`, `attendance.student_id`, `exam_result.student_id`, `wallet_transaction.wallet_id`, `message.sender_id/recipient_id` | models |
| L5 | `include_deleted` gating logic copy-pasted ~30× | endpoints |
| L6 | `lucide-react@^1.21.0` — non-existent major version, supply-chain typo-squat risk | `frontend/package.json:29` |
| L7 | `<img src={school.logo_url}>` renders arbitrary external images — SSRF surface | `(public)/login/page.tsx:112` |
| L8 | WebSocket upgrade has no origin check | `ws.py:11,31` |

---

## §5 — What is done well

For balance, the codebase correctly implements and tests:

- **bcrypt 12 rounds with constant-time verify** (`core/security.py:8`)
- **JWT type enforcement** (`type=access` checked on use; refresh/mfa/reset are distinct types; `jti` blacklist via Redis)
- **Brute-force lockout** (20/IP, 5/ID, 900s lockout with Redis counters)
- **MFA required for `SUPER_ADMIN` and `FINANCE` roles**; TOTP with 10 one-time backup codes
- **CSRF double-submit token** middleware on all mutating methods
- **Security headers middleware** (HSTS preload, X-Content-Type-Options, X-Frame-Options DENY, CSP `'self'` in prod)
- **Watermark middleware** (`X-Zenova-Instance` HMAC-encrypted, `X-Request-ID` per request)
- **HttpOnly + SameSite=Strict cookies** for access/refresh (only `user_role` is JS-readable)
- **Recovery code system** replaced the prior "license-key + employee_id = reset any password" flow (`core/security.py:102`)
- **License anti-tamper** — compiled C extension `coreval.pyd` with embedded public key, RSA-PSS signed `.lic` files, 8-component hardware fingerprint with environment-aware binding (bare_metal/VM/docker/unknown), 75% tolerance, TPM sealing optional, device change workflow with 24h auto-approve
- **Soft-delete global filter** via SQLAlchemy event listener with `.execution_options(include_deleted=True)` bypass
- **Rate limiting** — global 200/min + per-endpoint limits on login/auth/activate/license-verify
- **Audit logging** — `log_audit` called 160× across 28 files; `hashed_password` and JWT tokens are never logged

---

## Critical Issues Recap

| # | Title | Severity | Direct exploit |
|---|---|---|---|
| C1 | Cloud license-server issues keys + PII with no auth | Critical | Internet |
| C2 | License-server CORS `*` + credentials | Critical | Browser |
| C3 | `/installer/connect-vps` SSRF (unauthenticated) | Critical | Internet |
| C4 | Telegram webhook accepts any payload | Critical | Internet |
| C5 | `/sync/receive` body not signed | Critical | Network capture |
| C6 | `/settings` writable by any auth user | Critical | Authenticated student |
| C7 | NFC card_uid plaintext + cross-table collisions | Critical | $10 reader |

These 7 findings must be closed **before** any production deployment. None require continued deep code reading to verify — all confirmed against current source on 2026-07-06.

---

**End of SECURITY_AUDIT.md**
