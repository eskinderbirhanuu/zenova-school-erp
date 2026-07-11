# AI Analysis — ZENOVA School ERP

**Analyst:** GLM-5.2 (analysis/documentation mode)
**Date:** 2026-06-30
**Scope:** Full repository review (backend FastAPI, frontend Next.js 16, deployment, sync, licensing)
**Companion files:** `SECURITY_AUDIT.md`, `ARCHITECTURE_REVIEW_2026-06-30_GLM.md`, `PERFORMANCE_AUDIT.md`, `CODE_IMPROVEMENTS.md`, `TECHNICAL_DEBT.md`, `DEEPSEEK_TASKS.md`, `PRODUCTION_READINESS.md`

> Code was **read and analyzed**, not modified. Every finding below is documented for DeepSeek V4 Flash to implement from `DEEPSEEK_TASKS.md`.

---

## 1. Executive Summary

ZENOVA is a large, ambitious multi-tenant School ERP: ~158 Python files (52+ ORM models, ~40 endpoint files, 289 routes) and ~236 React/TSX pages/components, organized into 14 role-based route groups. The domain modeling (double-entry accounting, soft-delete, RBAC, hardware-bound licensing) is genuinely thoughtful, and a recent (June 29) hardening pass fixed many cross-tenant leaks.

However, the system is **NOT production-ready**. A focused review surfaced several **Critical** vulnerabilities and data-integrity defects that must be fixed before any production deployment:

- An **unauthenticated, unsigned `/sync/receive`** endpoint that lets anyone push arbitrary records to a local school server.
- A **path-traversal** in `/backups/{filename}/download` and `/DELETE` that can read/delete arbitrary files inside the app.
- A **license-key = universal password reset** flow (`/activate/reset-password`) usable by anyone holding a school's (widely shared) license key.
- A **signature drift** in `parent_portal.parent_make_payment` that calls `finance_service.record_payment` with kwargs that do not exist in the service signature → runtime crash on the cloud payment path.
- **Concurrency races** in cafeteria ordering (stock + wallet) and ID-sequence first-insert.
- **`log_audit` self-commits**, breaking transaction atomicity across the entire codebase.
- **No MFA**, **refresh-token endpoint not rate-limited**, **file uploads have no size/type limits**, **PII unencrypted**, **CSP allows `unsafe-eval`**.

**Production readiness score: 5.5 / 10** (see `PRODUCTION_READINESS.md`). Fixing the Critical items in `DEEPSEEK_TASKS.md` lifts this to ~7.5/10; reaching 9/10 requires the High/Medium architecture work.

---

## 2. Repository Inventory

| Layer | Count | Notes |
|-------|-------|-------|
| Backend Python | ~158 | 52+ ORM models, ~40 endpoint files, 289 routes, 24 services |
| Frontend TSX/TS | ~245 | 14 role route groups, Next.js 16 (WASM SWC fallback) |
| Migrations (Alembic) | 9 | Many untracked — `Base.metadata.create_all` still runs at startup |
| Docs (docs/) | 14 + 7 new | Existing consolidated docs + this audit series |

**Tech stack:** FastAPI 0.111 · SQLAlchemy 2.0.31 · PostgreSQL 16 (psycopg2) · Alembic · python-jose JWT + bcrypt/passlib · Redis 7 · Next.js 16.2.9 · Tailwind v4 · Radix/Shadcn · Recharts · Framer Motion.

---

## 3. Issue Register

Every issue below is cross-referenced from a dedicated audit file. Format:

### Issue N
- **File:** `path:line`
- **Severity:** Critical / High / Medium / Low
- **Category:** see below
- **Problem Description:** …
- **Why It Is A Problem:** …
- **Recommended Solution:** … (detailed steps in `DEEPSEEK_TASKS.md`)
- **Estimated Complexity:** S / M / L / XL
- **Production Impact:** …
- **Suggested Priority:** P0 / P1 / P2 / P3

---

### Issue 1 — Unauthenticated, unsigned cloud→local sync ingestion
- **File:** `backend/app/api/v1/endpoints/sync.py:28-33`
- **Severity:** Critical
- **Category:** Auth / Integrity
- **Problem Description:** `POST /sync/receive` accepts `data: dict` with **no `get_current_user` dependency and no HMAC/signature check**. The handler does nothing but echo the payload, but it is wired into the router and is the intended cloud→local ingestion path.
- **Why It Is A Problem:** Any network-reachable attacker (or a spoofed VPS) can POST arbitrary records to a local school server. Once the real ingestion logic is implemented this becomes a direct write primitive into student/finance tables; even today it leaks that the endpoint is live and is a CSRF/ping amplifier.
- **Recommended Solution:** Require a per-server shared secret rotated on registration, verify an HMAC-SHA256 over the canonical body + timestamp (±60s replay window), and require a registered `server_id`. Reject unless `server_role` is `VPS`/`MAIN_SCHOOL`. See `SECURITY_AUDIT.md` §1 and `DEEPSEEK_TASKS.md` Task-01.
- **Estimated Complexity:** M
- **Production Impact:** Total server compromise / data poisoning if left as-is.
- **Suggested Priority:** P0

---

### Issue 2 — Path traversal in backup download/delete
- **File:** `backend/app/api/v1/endpoints/backup.py:33-52`
- **Severity:** Critical
- **Category:** Path traversal / File disclosure
- **Problem Description:** `download_backup(filename)` and `delete_backup(filename)` join user-supplied `filename` directly into `BACKUP_DIR` with no sanitization: `os.path.join(BACKUP_DIR, filename)`. Inputs like `..%2f..%2fetc%2fpasswd` or `../../../../app/.env` resolve outside the backup directory.
- **Why It Is A Problem:** Authenticated (any role) arbitrary-file read and delete. Delete of `.env` / `license.lic` / app source is trivial; reading `.env` leaks `SECRET_KEY`, DB creds, SMTP password.
- **Recommended Solution:** Whitelist `^[A-Za-z0-9_.-]+$`, then verify `os.path.abspath(resolved) == os.path.abspath(os.path.join(BACKUP_DIR, basename))` and `os.path.commonpath([...]) == BACKUP_DIR`. Additionally gate behind `SUPER_ADMIN` only and audit-log every access. See Task-02.
- **Estimated Complexity:** S
- **Production Impact:** Credential leak + ransomware-grade file deletion.
- **Suggested Priority:** P0

---

### Issue 3 — License key is a universal password-reset token
- **File:** `backend/app/api/v1/endpoints/activate.py:286-309`
- **Severity:** Critical
- **Category:** Auth / Account takeover
- **Problem Description:** `POST /activate/reset-password` resets any user's password given only their `employee_id` + the school's **license key**. The license key is shared with every staff member who participated in activation, printed on invoices/docs, and stored in plaintext in the DB and `license.lic`.
- **Why It Is A Problem:** Any staff member (or anyone who saw the key) can reset the **ADMIN** account password and take over the whole school, including finance. This bypasses bcrypt entirely. The check `user.school_id == lic.school_id` only ensures same-school, not authorization.
- **Recommended Solution:** Remove this endpoint, or require (a) the target user's verified email/SMS OTP, or (b) an admin-issued HMAC recovery code from `core/security.issue_password_recovery_code` (already implemented but unused here). At minimum require SUPER_ADMIN or the user's own verified contact. See Task-03.
- **Estimated Complexity:** S
- **Production Impact:** Full account takeover of any school user.
- **Suggested Priority:** P0

---

### Issue 4 — Signature drift crashes cloud payment path
- **File:** `backend/app/api/v1/endpoints/parent_portal.py:141-172`
- **Severity:** Critical
- **Category:** Bug / Availability
- **Problem Description:** `parent_make_payment` calls:
  ```python
  finance_service.record_payment(db=db, data=data, payment_number=payment_number,
                                 received_by=current_user.id, school_id=..., branch_id=...)
  ```
  but `finance_service.record_payment(db, school_id, data, user_id)` (finance_service.py:305) has **no `payment_number`, `branch_id`, or `received_by` kwargs**. This raises `TypeError` on every cloud payment.
- **Why It Is A Problem:** The entire parent-portal payment flow is broken; every attempt 500s. Worse, the partial `Payment` rows already added before the exception may be left dangling depending on session handling.
- **Recommended Solution:** Align the call to the real signature: `finance_service.record_payment(db, current_user.school_id, data, current_user.id)`. If the intent was to let parents supply a payment number, extend the service signature intentionally and add an integration test. See Task-04.
- **Estimated Complexity:** S
- **Production Impact:** 100% failure of parent online payments.
- **Suggested Priority:** P0

---

### Issue 5 — `log_audit` self-commits, breaking transaction atomicity
- **File:** `backend/app/core/audit.py:6-30`
- **Severity:** High
- **Category:** Data integrity
- **Problem Description:** `log_audit()` calls `db.commit()` itself, and is invoked from inside service methods that also `db.commit()` (e.g. `finance_service.record_payment`, `cafeteria_service.create_order`). This forces an early commit of the surrounding business writes and means the audit row is persisted even if the caller later raises.
- **Why It Is A Problem:** (1) Partial writes — e.g. a payment line saved without its journal entry if the journal step fails after `log_audit`. (2) Audit records can survive the very transaction they were meant to describe, desyncing the audit trail from reality. (3) Double commits in nested calls (`finance_service.create_invoice` → `send_notification` paths).
- **Recommended Solution:** Make `log_audit` `db.add()` only and remove the `db.commit()`. Callers own the commit. Provide a `log_audit_and_commit` helper for the rare standalone case. Sweep all ~80 call sites to ensure the enclosing function commits. See Task-05.
- **Estimated Complexity:** M (mostly mechanical sweep)
- **Production Impact:** Silent ledger/audit desync, unreconstructable history.
- **Suggested Priority:** P0

---

### Issue 6 — Cafeteria order: stock & wallet race (no row locks)
- **File:** `backend/app/services/cafeteria_service.py:21-38`
- **Severity:** High
- **Category:** Concurrency / Money
- **Problem Description:** `create_order` reads `product.stock`, decrements it, and writes it back without `with_for_update()`. Two concurrent orders for the last unit both read `stock=1`, both decrement, both commit → oversell. Wallet (if used) is also decremented read-modify-write without a lock.
- **Why It Is A Problem:** Negative stock, lost revenue, double-spent wallets. POS is the highest-concurrency surface.
- **Recommended Solution:** Load each product with `with_for_update()`; load the wallet with `with_for_update()`; re-check stock/balance inside the transaction. Better: a single atomic `UPDATE ... SET stock = stock - :qty WHERE id = :id AND stock >= :qty` and check `rowcount`. See Task-06.
- **Estimated Complexity:** M
- **Production Impact:** Inventory & cash loss under load.
- **Suggested Priority:** P0

---

### Issue 7 — ID sequence first-insert race
- **File:** `backend/app/services/id_service.py:14-40`
- **Severity:** High
- **Category:** Concurrency / Uniqueness
- **Problem Description:** `generate_id` does `with_for_update()` only on the *existing* row path. On the first ID of a year (no row yet) it `db.add(seq); db.flush()` without a unique-constraint guard. Two concurrent "first student of the year" requests both insert, both get `last_number=1` → duplicate `STU-2026-00001`, or one fails on the implicit unique index (if any) with an unhandled error.
- **Why It Is A Problem:** Duplicate human-facing IDs break transcripts, invoices, and external integrations; or the create fails entirely.
- **Recommended Solution:** Add a `UNIQUE(prefix, school_id, year)` constraint on `number_sequences` (migration) and wrap the insert in a retry-on-integrity-error loop, or `INSERT ... ON CONFLICT DO UPDATE ... RETURNING last_number` then increment under lock. See Task-07.
- **Estimated Complexity:** M
- **Production Impact:** Duplicate/failed student & invoice IDs at year boundaries.
- **Suggested Priority:** P1

---

### Issue 8 — `promote_student` ignores school_id on the student fetch (IDOR)
- **File:** `backend/app/services/academic_service.py:411-424`
- **Severity:** High
- **Category:** Cross-tenant / IDOR
- **Problem Description:** `promote_student` fetches `db.query(StudentModel).filter(StudentModel.id == student_id).first()` with **no `school_id` filter**, even though `school_id` is passed in and used for the `PromotionRecord`. A director/registrar from school A can promote a student from school B by guessing/using their UUID.
- **Why It Is A Problem:** Cross-tenant mutation of academic records; violates the core multi-tenancy rule.
- **Recommended Solution:** Add `StudentModel.school_id == school_id` to the filter. Audit all other `Student`/`Parent`/`Invoice` fetches that take an `id` without a tenant filter (use the checklist in `SECURITY_AUDIT.md` §10). See Task-08.
- **Estimated Complexity:** S
- **Production Impact:** Cross-school data tampering.
- **Suggested Priority:** P1

---

### Issue 9 — Default `SECRET_KEY` shipped in code & compose
- **File:** `backend/app/config.py:9`, `docker-compose.yml:37`, `backend/.env.example:3`
- **Severity:** High
- **Category:** Secrets / Crypto
- **Problem Description:** `secret_key: str = "dev-secret-key"` is the fallback; compose ships `SECRET_KEY: "dev-secret-key-change-in-production"`. `config.validate()` only raises if `environment == "production"`, which is *not* the default and is easy to forget. With the default key, all JWTs are forgeable (HS256), password-reset tokens are forgeable, and recovery-code HMACs are forgeable.
- **Why It Is A Problem:** Total auth bypass on any deployment that forgets to override the key.
- **Recommended Solution:** Fail-fast: if `SECRET_KEY` equals any known default **or** < 32 bytes of entropy, refuse to start in any environment (or auto-generate and persist on first run with a loud warning). Remove the default value from `docker-compose.yml`. See Task-09.
- **Estimated Complexity:** S
- **Production Impact:** Forged SUPER_ADMIN tokens on misconfigured deploys.
- **Suggested Priority:** P0

---

### Issue 10 — Refresh endpoint not rate-limited
- **File:** `backend/app/api/v1/endpoints/auth.py:242-305`
- **Severity:** Medium
- **Category:** Auth / DoS
- **Problem Description:** `/auth/refresh` has no `Depends(...)` rate limiter, unlike `/login` and `/auth/*`. A stolen refresh token can be hammered to mint access tokens; the blacklist-on-rotate logic does help but doesn't limit brute guessing of refresh-token jti.
- **Why It Is A Problem:** Token amplification and log spam; minor DoS.
- **Recommended Solution:** Apply `AUTH_RATE_LIMIT` and additionally a per-user refresh rate. See Task-10.
- **Estimated Complexity:** S
- **Production Impact:** Low–medium; defense in depth.
- **Suggested Priority:** P2

---

### Issue 11 — No file-upload size/type limits
- **File:** `backend/app/api/v1/endpoints/students.py:357-397` (and all `UploadFile` endpoints)
- **Severity:** Medium
- **Category:** DoS / Storage abuse
- **Problem Description:** `upload_student_document` reads `file.file.read()` fully into memory with no max-size check, no content-type whitelist, and stores under `uploads/students/{student_id}/{uuid}.{ext}` served by the app. An attacker (any authenticated staff) can upload a 10 GB file to OOM the worker, or upload `.html`/`.svg` served as the stored content-type (stored `file_type=file.content_type` is attacker-controlled).
- **Why It Is A Problem:** Worker OOM, disk exhaustion, stored XSS via served uploads.
- **Recommended Solution:** Cap `Content-Length` (e.g. 10 MB) via middleware and per-route; stream to disk in chunks; whitelist `[pdf, jpg, png, docx]`; force `Content-Disposition: attachment` and a safe `Content-Type` when serving; store outside the web root and serve via a controlled endpoint. See Task-11.
- **Estimated Complexity:** M
- **Production Impact:** DoS + stored XSS.
- **Suggested Priority:** P1

---

### Issue 12 — CSP allows `unsafe-eval`; CSRF double-middleware confusion
- **File:** `backend/app/main.py:44-52` (CSP) and `main.py:25-31` + note in docs/SECURITY.md
- **Severity:** Medium
- **Category:** Hardening
- **Problem Description:** The Content-Security-Policy ships `script-src 'self' 'unsafe-eval'` (needed by some Next.js dev modes but unsafe in prod). `docs/SECURITY.md` also documents a historical "double CORS middleware (one wildcard)" — the current `main.py` has only one strict CORS, so that specific issue appears **resolved**, but verify no other module re-adds `allow_origins=["*"]`.
- **Why It Is A Problem:** `unsafe-eval` weakens XSS defenses; a wildcard CORS would re-enable credentialed cross-origin reads.
- **Recommended Solution:** In production, drop `'unsafe-eval'` (use Next.js nonces). Add a startup assertion that `ALLOWED_ORIGINS` contains no `"*"`. See Task-12.
- **Estimated Complexity:** S
- **Production Impact:** Hardening; not a direct exploit alone.
- **Suggested Priority:** P2

---

### Issue 13 — `is_view_only` enforced only in `PermissionChecker`, not `require_role`
- **File:** `backend/app/core/permissions.py:59-93`
- **Severity:** Medium
- **Category:** Authz
- **Problem Description:** `has_permission` blocks `is_view_only` users (good), but `require_role("FINANCE")` bypasses `has_permission` entirely — it only checks `role.name`. So a view-only FINANCE user outside the school network can still POST to `/payments` because the route uses `require_role`, not `PermissionChecker`.
- **Why It Is A Problem:** The "view-only outside network" core rule is silently broken on every `require_role`-protected route (most of finance/HR/inventory/library).
- **Recommended Solution:** Make `require_role` also consult `is_view_only` (and a future `is_superuser`-only carve-out), or migrate all mutation routes to `PermissionChecker`. Unify the two systems. See Task-13.
- **Estimated Complexity:** M
- **Production Impact:** Outside-network mutation bypass.
- **Suggested Priority:** P1

---

### Issue 14 — Soft-delete not modeled on ~54 entities (auto-filter only helps if column exists)
- **File:** `backend/app/database.py:6-20` + many models
- **Severity:** Medium
- **Category:** Data integrity / Core rule violation
- **Problem Description:** The SQLAlchemy `before_compile` event auto-appends `deleted_at IS NULL` **only for entities that have a `deleted_at` column**. ~54 models (per `docs/REVIEWS.md`) still lack the column, so deletes on them are either hard `db.delete()` or no-ops. A migration `9e8f7a6b5c4d3e2f_add_deleted_at_to_all_remaining_tables.py` is untracked and may not be applied.
- **Why It Is A Problem:** Violates the "no hard delete, everything recoverable" core rule for those entities; `Base.metadata.create_all` at startup races with Alembic.
- **Recommended Solution:** Audit models vs migrations; ensure every business model has `deleted_at`; stop running `create_all` in production (Alembic-only). See Task-14.
- **Estimated Complexity:** L
- **Production Impact:** Irreversible data loss on affected entities.
- **Suggested Priority:** P2

---

### Issue 15 — No DB-level double-entry constraint; `Invoice.paid_amount` / `Wallet.balance` drift risks
- **File:** `backend/app/models/journal.py`, `invoice.py`, `wallet.py`
- **Severity:** Medium
- **Category:** Financial integrity
- **Problem Description:** Double-entry balance is enforced only in Python (`create_journal_entry`). There is no DB `CHECK` or trigger ensuring `sum(debit)=sum(credit)` per journal entry, and reversals create a second entry without re-validating the original's integrity. `Invoice.paid_amount` is updated incrementally and can desync from `sum(Payment.amount)`. `Wallet.balance` is a stored column recomputed from transactions.
- **Why It Is A Problem:** Silent ledger drift over time; auditors cannot trust the books.
- **Recommended Solution:** Add a materialized view / periodic reconciliation job that asserts `sum(debit)=sum(credit)` per entry and `Invoice.paid_amount = sum(payments)`. Add a `CHECK (debit >= 0 AND credit >= 0)` and a trigger or stored proc for entry balance. See Task-15.
- **Estimated Complexity:** L
- **Production Impact:** Accounting integrity erosion.
- **Suggested Priority:** P2

---

### Issue 16 — N+1 / unbounded queries in reporting & portal endpoints
- **File:** `backend/app/api/v1/endpoints/students.py:226-330` (transcript), `parent_portal.py:23-106`, `finance_service.trial_balance:631-649`
- **Severity:** Medium
- **Category:** Performance
- **Problem Description:** The transcript endpoint loops semesters → exams → results → subjects issuing many queries per student. `parent_portal_dashboard` issues ~7 queries per child. `trial_balance` runs one sub-query per account. `export_students_excel` loads up to 5000 rows.
- **Why It Is A Problem:** O(n²) latency on large schools (10–20k students); DB connection pool exhaustion.
- **Recommended Solution:** Use `selectinload`/`joinedload` for relationships, aggregate queries for counts, and paginate/stream exports. See `PERFORMANCE_AUDIT.md` and Task-16.
- **Estimated Complexity:** M
- **Production Impact:** Slow pages + pool starvation at scale.
- **Suggested Priority:** P2

---

### Issue 17 — Two permission systems + `Role.level` unused
- **File:** `backend/app/core/permissions.py`, `models/role.py`
- **Severity:** Low
- **Category:** Tech debt / Authz clarity
- **Problem Description:** `require_role` (string match) and `PermissionChecker` (granular codes) coexist; `Role.level` (10–100) is stored but never enforced. Some routes use one, some the other.
- **Recommended Solution:** Unify on `PermissionChecker` with level-based fallback; remove or actually use `Role.level`. See Task-17.
- **Estimated Complexity:** M
- **Production Impact:** Maintenance burden, latent authz gaps.
- **Suggested Priority:** P3

---

### Issue 18 — WebSocket auth has no expiry/revocation re-check
- **File:** `backend/app/api/v1/endpoints/ws.py:8-25`
- **Severity:** Low
- **Category:** Auth / Session
- **Problem Description:** `/ws/notifications` validates the token once at connect time but never re-checks blacklist/expiry during the long-lived connection. A logged-out or revoked user keeps receiving notifications until they disconnect.
- **Recommended Solution:** Periodically re-validate `jti` against the Redis blacklist (e.g. every 60s) and close on revocation. See Task-18.
- **Estimated Complexity:** S
- **Production Impact:** Stale access after logout.
- **Suggested Priority:** P3

---

## 4. Cross-cutting Observations (non-blocking)

- **`get_client_ip` trusts `X-Forwarded-For` blindly** (`deps.py:8-12`). Behind Nginx this is fine *if* Nginx is the only setter and overwrites the header; in direct-expose setups a client can spoof IP to bypass brute-force/rate limits. Document the Nginx requirement or use `request.client.host` when `X-Forwarded-For` is absent/trusted-proxy-only.
- **`bcrypt_rounds=12`** is reasonable; ensure `passlib` ≥ 1.7.4 to avoid the `switchable=True` arg issues (verify_password passes `switchable=True` which is non-standard — confirm it doesn't silently fall back).
- **Audit log has no `school_id`** on many rows → super-admin cross-school audit queries are hard. Add `school_id` to `AuditLog`.
- **`number_sequences` race** (Issue 7) is the same class as `_next_invoice_number`/`_next_payment_number` COUNT()-based generators in `finance_service.py` — those also race and should switch to the same sequence table.
- **`Base.metadata.create_all` at startup** while also shipping Alembic is a footgun; in production it can mask missing migrations.
- **`docs/SECURITY.md` "double CORS"** appears resolved in current `main.py` (single strict middleware). Recommend a regression test/assertion so it cannot return.

---

## 5. Mapping to Other Audit Files

| Topic | File |
|-------|------|
| Vulnerabilities, attack scenarios, fixes | `SECURITY_AUDIT.md` |
| Multi-tenancy, sync, offline, scalability | `ARCHITECTURE_REVIEW_2026-06-30_GLM.md` |
| N+1, indexes, caching, payloads | `PERFORMANCE_AUDIT.md` |
| Refactor opportunities | `CODE_IMPROVEMENTS.md` |
| Debt register | `TECHNICAL_DEBT.md` |
| Step-by-step implementation for DeepSeek | `DEEPSEEK_TASKS.md` |
| Go/no-go score & blockers | `PRODUCTION_READINESS.md` |

**Priority legend:** P0 = block production · P1 = fix before scale · P2 = hardening · P3 = tech debt.
