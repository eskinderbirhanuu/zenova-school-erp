# DeepSeek V4 Flash — Task List

**Date:** 2026-06-30 · **Author:** GLM-5.2 (analysis mode)
**Audience:** DeepSeek V4 Flash (implementation agent).

This is your work queue. Each task is **self-contained**: file(s), the exact problem, step-by-step fix, side effects, and required tests. Work top-to-bottom by priority. After each task: (1) run the test suite, (2) update `docs/CHANGELOG.md`, (3) commit with message `fix(<area>): <task-id> <summary>`.

**Conventions**
- Preserve existing code style (FastAPI + SQLAlchemy 2.0, Pydantic v2, `from app...` imports).
- Money uses `Decimal`, never `float` (existing code is mostly compliant).
- Every mutation must continue to call `log_audit` — but after Task-05 lands, callers own the commit.
- Never weaken multi-tenant filters. When in doubt, add `.filter(Model.school_id == current_user.school_id)`.

**Priority legend:** P0 = blocks production · P1 = before scale · P2 = hardening · P3 = tech debt.

---

## P0 — Critical (do these first, in order)

### Task-01 — Secure the `/sync/receive` endpoint  (P0)
- **File:** `backend/app/api/v1/endpoints/sync.py:28-33`
- **Problem:** `POST /sync/receive` has no auth and no signature check; it is the cloud→local ingestion surface and currently accepts arbitrary JSON.
- **Recommended Fix:** Until a real signed protocol is implemented (Task-19), make the endpoint refuse all traffic safely.
- **Steps:**
  1. In `sync.py`, replace the `receive_sync` body with:
     ```python
     from fastapi import Header, HTTPException, status
     from app.core.server_identity import get_server_identity
     import hmac, hashlib, time

     ALLOWED_CLOCK_SKEW = 60  # seconds

     @router.post("/sync/receive")
     def receive_sync(
         payload: dict,
         x_zenova_server_id: str = Header(..., alias="X-Zenova-Server-Id"),
         x_zenova_sync_ts: str = Header(..., alias="X-Zenova-Sync-Ts"),
         x_zenova_sync_sig: str = Header(..., alias="X-Zenova-Sync-Sig"),
         db: Session = Depends(get_db),
     ):
         identity = get_server_identity() or {}
         secret = identity.get("sync_secret")
         if not secret:
             raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail="Sync not configured")
         try:
             ts = int(x_zenova_sync_ts)
         except ValueError:
             raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Bad timestamp")
         if abs(int(time.time()) - ts) > ALLOWED_CLOCK_SKEW:
             raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Stale sync payload")
         # canonical message must match what the sender computed
         msg = f"{x_zenova_server_id}.{x_zenova_sync_ts}".encode()
         expected = hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()
         if not hmac.compare_digest(expected, x_zenova_sync_sig):
             raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
         # TODO(Task-19): apply payload
         return {"received": True, "count": 0}
     ```
  2. Ensure `get_server_identity()` returns a `sync_secret` (a 32-byte hex random) — store it in the existing `server_identity` module / `ServerIdentity` model. If that model lacks the column, add it in Task-19's migration and have this endpoint 503 until configured.
  3. Verify the endpoint returns 400/401/503 appropriately for missing headers / bad sig / unconfigured.
- **Possible Side Effects:** Any test or script that POSTs to `/sync/receive` will now fail — that's intended. The endpoint effectively does nothing until Task-19.
- **Testing:** Add `backend/tests/test_sync_security.py`:
  - no headers → 422;
  - unconfigured server → 503;
  - stale ts → 401;
  - bad signature → 401;
  - (skip the success path until Task-19, just assert `received: True` shape is allowed).

---

### Task-02 — Patch path traversal in backup endpoints  (P0)
- **File:** `backend/app/api/v1/endpoints/backup.py:33-52`
- **Problem:** `filename` is joined into `BACKUP_DIR` without sanitization → arbitrary read/delete.
- **Recommended Fix:** Validate filename, enforce directory containment, restrict to SUPER_ADMIN, audit-log.
- **Steps:**
  1. At top of `backup.py` add:
     ```python
     import re, os
     from app.core.permissions import require_role
     from app.core.audit import log_audit
     SAFE_NAME = re.compile(r"^[A-Za-z0-9_.-]{1,128}$")
     def _safe_path(filename: str) -> str:
         if not SAFE_NAME.match(filename):
             raise HTTPException(400, "Invalid filename")
         base = os.path.realpath(backup_service.BACKUP_DIR)
         resolved = os.path.realpath(os.path.join(base, filename))
         if os.path.commonpath([resolved, base]) != base:
             raise HTTPException(400, "Invalid filename")
         return resolved
     ```
  2. In `download_backup` and `delete_backup`, replace `os.path.join(BACKUP_DIR, filename)` with `_safe_path(filename)`.
  3. Change both route dependencies from `Depends(get_current_user)` to `dependencies=[require_role("SUPER_ADMIN")]` and keep `current_user=Depends(get_current_user)` for the audit.
  4. Add `log_audit(db, current_user.id, "BACKUP_DOWNLOADED"/"BACKUP_DELETED", "backup", filename, ip_address=..., user_agent=...)` — pass IP/UA via `get_client_ip(request)`/`get_user_agent(request)` (add `request: Request` param).
- **Possible Side Effects:** Non-super-admin users lose backup access (intended). Backups with spaces or unusual chars in the name break — adopt a naming convention in `backup_service.create_backup` (timestamp + `.sql.gz`, ASCII only).
- **Testing:** `test_backup_security.py`:
  - `..%2F..%2f.env` → 400;
  - `safe.sql` under dir → 200;
  - FINANCE user → 403;
  - audit row created.

---

### Task-03 — Remove license-key password reset  (P0)
- **File:** `backend/app/api/v1/endpoints/activate.py:286-309`
- **Problem:** Anyone with the school license key can reset any user's password.
- **Recommended Fix:** Replace with the HMAC recovery-code flow already in `core/security.issue_password_recovery_code`.
- **Steps:**
  1. Replace the endpoint with two:
     - `POST /activate/recovery/issue` (authenticated, ADMIN+ or SUPER_ADMIN): takes `employee_id`, verifies the target is in the caller's school, calls `issue_password_recovery_code(target.id, ttl_seconds=600)`, returns the code (display once to the admin).
     - `POST /activate/recovery/reset` (public, rate-limited via existing `RESET_PASSWORD_LIMIT`): takes `employee_id`, `code`, `new_password`; loads user, verifies `verify_password_recovery_code(code, user.id)`, calls `auth_service.reset_password(db, user.id, new_password)` (which already enforces strength + no reuse).
  2. Delete the old `/activate/reset-password` route **and** remove it from any frontend calls (search `frontend/` for `reset-password` under `activate`).
  3. Refuse to issue recovery codes for `is_superuser=True` users via the public path.
- **Possible Side Effects:** Offline-only schools with no email lose the "license key reset" crutch. Mitigate by documenting the admin-issued recovery code flow. If the product truly requires offline self-reset, add TOTP seeded at activation as a second factor (out of scope here).
- **Testing:** `test_activate_recovery.py`:
  - issue requires ADMIN+;
  - reset with valid code succeeds and changes password;
  - reset with wrong code fails;
  - reset for superuser via public path forbidden;
  - rate limit enforced.

---

### Task-04 — Fix parent-portal payment signature drift  (P0)
- **File:** `backend/app/api/v1/endpoints/parent_portal.py:141-172`
- **Problem:** `finance_service.record_payment` is called with kwargs (`payment_number`, `received_by`, `branch_id`) that don't exist on the service.
- **Recommended Fix:** Align the call to the real signature.
- **Steps:**
  1. Replace the body of `parent_make_payment`:
     ```python
     student_ids = get_linked_student_ids(db, current_user)
     invoice = db.query(Invoice).filter(
         Invoice.id == data.invoice_id,
         Invoice.school_id == current_user.school_id,
     ).first()
     if not invoice:
         raise HTTPException(404, "Invoice not found")
     if invoice.student_id not in student_ids:
         raise HTTPException(403, "Invoice does not belong to a linked student")
     if invoice.status == "paid":
         raise HTTPException(400, "Invoice is already paid")
     if not data.idempotency_key:
         data.idempotency_key = f"parent:{current_user.id}:{invoice.id}:{int(datetime.now(timezone.utc).timestamp())}"
     payment = finance_service.record_payment(db, current_user.school_id, data, current_user.id)
     return { ...existing response... }
     ```
  2. Remove the now-unused `id_service` import if nothing else uses it.
- **Possible Side Effects:** None — current code cannot succeed. Verify the `PaymentCreate` schema includes `idempotency_key` (it does — `record_payment` requires it).
- **Testing:** Integration test that posts a `PaymentCreate` through `/parent-portal/payments` and asserts 200 + invoice `paid_amount` increases.

---

### Task-05 — Make `log_audit` non-committing  (P0)
- **File:** `backend/app/core/audit.py`; sweep all callers.
- **Problem:** `log_audit` commits, breaking transactional unit-of-work.
- **Recommended Fix:** Remove the commit; callers own it.
- **Steps:**
  1. Edit `log_audit`: remove `db.commit()`; keep `db.add(audit)`; add a docstring "Does NOT commit — caller is responsible."
  2. Add `def log_audit_and_commit(db, ...): log_audit(...); db.commit()` for the few standalone callers (e.g. `auth_service.log_login_audit`, `log_security_event`) — OR have those two functions explicitly commit after calling `log_audit`.
  3. Grep `log_audit(` across `backend/app` (≈80 hits). For each service function that calls `log_audit` **before** its own `db.commit()`, no change needed (the commit still happens). For each service that called `log_audit` and relied on its commit (rare — look for functions with no `db.commit()` of their own), add `db.commit()`.
  4. Pay special attention to: `finance_service.record_payment`, `wallet_transaction`, `cafeteria_service.create_order`, `academic_service.bulk_*` — verify they still commit exactly once.
- **Possible Side Effects:** A handful of functions may now not commit where they previously did via the side effect → audit/business row not saved. Mitigate by the sweep in step 3.
- **Testing:** Existing `test_finance_security.py` should still pass. Add `test_audit_atomicity.py`:
  - force an exception after `log_audit` in a test service → assert **no** audit row is persisted (transaction rolled back).

---

### Task-06 — Lock rows in cafeteria order  (P0)
- **File:** `backend/app/services/cafeteria_service.py:21-38`
- **Problem:** Stock & wallet decremented read-modify-write without locks → oversell.
- **Recommended Fix:** `with_for_update()` on products (and wallet, when used).
- **Steps:**
  1. In `create_order`, load each product locked:
     ```python
     product = db.query(CafeteriaProduct).filter(
         CafeteriaProduct.id == item.product_id,
         CafeteriaProduct.school_id == school_id,
     ).with_for_update().first()
     ```
     (note: also add the missing `school_id` filter — currently any product id works cross-tenant).
  2. After loading all items, re-check `product.stock >= item.quantity`.
  3. If the order pays from a wallet, load `Wallet` with `with_for_update()` and re-check balance.
  4. Wrap the whole order in one transaction; commit once at the end (it already does — just ensure no intermediate commit from `log_audit` after Task-05).
- **Possible Side Effects:** Slightly lower throughput on the same product under heavy contention (acceptable; correctness > throughput).
- **Testing:** `test_cafeteria_concurrency.py` — spawn two threads ordering the last unit; assert exactly one succeeds, stock ends at 0.

---

### Task-07 — Fix `id_service` first-insert race  (P1, but cheap — do with Task-06)
- **File:** `backend/app/services/id_service.py`; new Alembic migration.
- **Problem:** First ID of a year has no row yet → two concurrent inserts both get `last_number=1`.
- **Recommended Fix:** Unique constraint + retry.
- **Steps:**
  1. Create migration `<rev>_unique_number_sequences.py` adding `UniqueConstraint("prefix", "school_id", "year", name="uq_number_seq_prefix_school_year")` on `number_sequences`.
  2. Rewrite `generate_id`:
     ```python
     from sqlalchemy.exc import IntegrityError
     for _ in range(3):
         seq = db.query(NumberSequence).filter(...).with_for_update().first()
         if seq is None:
             seq = NumberSequence(prefix=prefix, school_id=school_id, year=year, last_number=0)
             db.add(seq)
             try:
                 db.flush()
             except IntegrityError:
                 db.rollback()
                 continue
         seq.last_number += 1
         db.flush()
         return f"{prefix}-{year}-{seq.last_number:05d}"
     raise RuntimeError("Could not generate ID after retries")
     ```
  3. Backfill/dedupe before applying the constraint if duplicates exist (inspect in migration).
- **Possible Side Effects:** A duplicate in existing data blocks the migration — handle in the migration's `upgrade()` with a dedupe step.
- **Testing:** `test_id_sequence_concurrency.py` — 50 concurrent `generate_id("student", sid)` → assert 50 unique sequential IDs.

---

### Task-08 — Close IDOR in `promote_student` + tenant-filter sweep  (P1)
- **Files:** `backend/app/services/academic_service.py:411-414` (primary); sweep `services/*.py` and `endpoints/*.py`.
- **Problem:** `promote_student` fetches the student without `school_id`.
- **Recommended Fix:** Add the filter; audit every fetch-by-id.
- **Steps:**
  1. In `academic_service.promote_student`, change the query to:
     ```python
     student = db.query(StudentModel).filter(
         StudentModel.id == student_id,
         StudentModel.school_id == school_id,
     ).first()
     ```
  2. Grep for patterns that fetch a model by `id` without a tenant filter:
     - `db.query(<Model>).filter(<Model>.id == ...)` where `<Model>` is one of `Student, Parent, Invoice, Payment, Wallet, ExamResult, TeacherProfile, StaffProfile, CafeteriaProduct, CafeteriaOrder, Book, ...` and the surrounding function receives a `school_id`/`current_user`.
  3. For each, add the tenant filter (or a relationship join that enforces it). Pay attention to `parent_portal.py` queries (Security 3.11): add explicit `Student.school_id == parent.school_id` and rely on the soft-delete auto-filter where columns exist.
  4. Document the IDOR checklist in `docs/SECURITY.md` (append a "Tenant isolation checklist" section).
- **Possible Side Effects:** Some previously-"working" cross-tenant calls now 404 — that's the intended fix.
- **Testing:** `test_tenant_isolation.py` — create two schools, a student in each; log in as school A admin; attempt to GET/PATCH school B's student by id → assert 404.

---

### Task-09 — Fail-fast on default/weak SECRET_KEY  (P0)
- **Files:** `backend/app/config.py`, `docker-compose.yml`, `backend/.env.example`.
- **Problem:** Default `secret_key="dev-secret-key"`; weak prod guard.
- **Recommended Fix:** Refuse to boot with a known-default or low-entropy key.
- **Steps:**
  1. In `config.py`, change `validate()`:
     ```python
     KNOWN_DEFAULTS = {"", "dev-secret-key", "dev-secret-key-change-in-production", "your-super-secret-key-change-this-in-production"}
     def validate(self):
         if self.secret_key in KNOWN_DEFAULTS:
             raise ValueError("SECRET_KEY is a known default — set a strong SECRET_KEY env var")
         if len(self.secret_key) < 32:
             raise ValueError("SECRET_KEY must be at least 32 characters")
         if self.is_production and self.cookie_secure is False:
             self.cookie_secure = True
     ```
  2. Run this validation in **all** environments (not just production).
  3. Remove the hardcoded `SECRET_KEY` line from `docker-compose.yml`; document that operators must supply one.
  4. Update `.env.example` to show a placeholder `SECRET_KEY=<generate with: python -c "import secrets;print(secrets.token_urlsafe(48))">`.
- **Possible Side Effects:** Existing dev setups without a `.env` will fail to start — fix by generating a key once. Add a `make devkey` script if desired.
- **Testing:** Unit test `test_config.py` — each known default raises; a 32-char random passes.

---

### Task-10 — Rate-limit `/auth/refresh`  (P2)
- **File:** `backend/app/api/v1/endpoints/auth.py:242`
- **Recommended Fix:** Add `Depends(AUTH_RATE_LIMIT)` to the signature and a per-user refresh counter in Redis.
- **Steps:**
  1. Add `_ip: str = Depends(AUTH_RATE_LIMIT)` to `refresh_token`.
  2. (Optional) per-user cap: `redis.incr(f"refresh:uid:{user_id}")` with 60s expire; reject if > 30.
- **Testing:** Hammer `/auth/refresh` 11 times in 60s → 11th returns 429.

---

### Task-11 — File upload size/type limits  (P1)
- **Files:** all `UploadFile` endpoints (`students.py`, plus any in hr/library/inventory); new middleware.
- **Recommended Fix:** Global `Content-Length` cap + per-route streaming + whitelist.
- **Steps:**
  1. Add `app/middleware/max_body.py` (or inline in `main.py`) capping request body at 10 MB; return 413 on overflow.
  2. In `upload_student_document`, stream to disk:
     ```python
     ALLOWED_EXT = {"pdf", "jpg", "jpeg", "png", "docx"}
     ext = (file.filename.rsplit(".",1)[-1] if "." in file.filename else "").lower()
     if ext not in ALLOWED_EXT: raise HTTPException(400, "Unsupported file type")
     safe_name = f"{uuid.uuid4()}.{ext}"
     path = os.path.join(UPLOAD_ROOT, "students", str(student_id), safe_name)
     os.makedirs(os.path.dirname(path), exist_ok=True)
     size = 0
     with open(path, "wb") as f:
         while chunk := file.file.read(1024*1024):
             size += len(chunk)
             if size > 10*1024*1024:
                 f.close(); os.remove(path)
                 raise HTTPException(413, "File too large")
             f.write(chunk)
     ```
  3. Move uploads outside the web root; serve via a dedicated `/files/<token>` endpoint that forces `Content-Disposition: attachment` and a safe `Content-Type`.
  4. Store `file_type` from the whitelist, not from `file.content_type`.
- **Possible Side Effects:** Existing large uploads rejected (intended). Frontend must surface 413/400 cleanly.
- **Testing:** Upload 11 MB → 413; upload `.exe` → 400; upload `.pdf` → 201; serve returns attachment disposition.

---

### Task-12 — Harden CSP + CORS regression test  (P2)
- **Files:** `backend/app/main.py:44-52`; new test.
- **Steps:**
  1. In production (`settings.is_production`), drop `'unsafe-eval'` from `script-src`; keep it only in dev. Use a config-driven CSP string.
  2. Add a startup assertion: if `"*"` in `ALLOWED_ORIGINS`, raise.
  3. Add `test_security_headers.py` asserting HSTS, X-Frame-Options, CSP, and that CORS reflects the configured origin (no wildcard).
- **Testing:** As above.

---

### Task-13 — Make `require_role` honor `is_view_only`  (P1)
- **File:** `backend/app/core/permissions.py:83-93`
- **Steps:**
  1. Change `_check_role` to also consult `has_permission` for the view-only flag:
     ```python
     def _check_role(current_user):
         if current_user.is_superuser:
             return current_user
         if current_user.is_view_only:
             raise HTTPException(403, "View-only mode: mutations are disabled outside the school network")
         if not current_user.role or current_user.role.name != role_name:
             raise HTTPException(403, f"Requires role: {role_name}")
         return current_user
     ```
  2. Verify GET-only routes are unaffected (they don't use `require_role` for the mutation guard; or relax GET routes to use a separate `allow_view_only=True` flag if needed).
- **Possible Side Effects:** View-only users will now be blocked from mutations — that's the core rule. Confirm legitimate read endpoints don't accidentally use `require_role` on GET.
- **Testing:** Role-matrix test (Task-25) with an `is_view_only=True` FINANCE user POSTing to `/payments` → 403.

---

### Task-14 — Soft-delete coverage + Alembic-only in prod  (P2)
- **Files:** all `backend/app/models/*.py`; `backend/app/main.py` startup; migrations.
- **Steps:**
  1. Write a script listing models without `deleted_at`; add the column to the stragglers via one Alembic migration (or confirm `9e8f7a6b5c4d3e2f_add_deleted_at_to_all_remaining_tables` is applied — it's untracked, so `git add` it and run `alembic upgrade head`).
  2. In `main.py` startup, gate `Base.metadata.create_all(engine)` behind `if not settings.is_production` — production must run `alembic upgrade head` from the deploy script.
  3. Add a CI test that `alembic upgrade head` on a fresh DB produces a schema whose tables/columns match `Base.metadata`.
- **Testing:** As above; plus assert a soft-deleted row is excluded from list endpoints for a newly-covered model.

---

### Task-15 — Financial integrity reconciliation  (P2)
- **Files:** new `backend/app/services/reconciliation_service.py`; scheduled job (manual trigger for now).
- **Steps:**
  1. Add `reconcile_ledger(db, school_id)` that, for each `JournalEntry`, asserts `sum(debit) == sum(credit)` within tolerance, and `Invoice.paid_amount == sum(Payment.amount where invoice_id=...)`, and `Wallet.balance == sum(transaction deltas)`. Returns a report of drifts.
  2. Add an endpoint `GET /finance/reconcile` (FINANCE+ADMIN) that runs it.
  3. (Optional) add a DB `CHECK (debit >= 0 AND credit >= 0)` on `journal_lines` via migration.
- **Testing:** Seed a deliberate drift; assert it's reported.

---

### Task-16 — Kill N+1 in transcript + parent dashboard + trial balance  (P2)
- **Files:** `endpoints/students.py:226-330`; `endpoints/parent_portal.py:23-106`; `services/finance_service.py:631-649`.
- **Steps (transcript):** extract `transcript_service.build(db, student_id, school_id)`; fetch all `Exam`+`ExamResult`+`Subject` in two bulk queries (`exam_id IN (...)`), join in Python via dicts; cache result in Redis 5 min keyed by `transcript:{student_id}`.
- **Steps (parent dashboard):** replace per-child `count()` with one `GROUP BY student_id` attendance query across all linked ids; batch invoice/results queries.
- **Steps (trial balance):** single aggregate `GROUP BY account_id`.
- **Testing:** Add tests asserting identical output before/after; add a concurrency/latency smoke check.

---

### Task-17 — Unify RBAC  (P3)
- **Files:** `core/permissions.py`; sweep all endpoints.
- **Steps:**
  1. Implement `require(*perms)`, `require_level(level)`, and refactor `require_role` to delegate to `has_permission`.
  2. Make `RoleResponse.level: Optional[int] = Field(None, ge=0, le=100)`.
  3. Sweep endpoints to use the granular helpers where a level-based check is clearer.
- **Testing:** Role-matrix test (Task-25).

---

### Task-18 — Re-validate WebSocket tokens  (P3)
- **File:** `backend/app/api/v1/endpoints/ws.py`
- **Steps:** Inside the receive loop, every 60s, re-decode the token and check the blacklist; on revocation/expiry, close with code 4001 and disconnect.
- **Testing:** Hard to unit-test; add an async test that connects, then blacklists the jti, then asserts the socket closes within ~60s (or shorten interval via env for tests).

---

### Task-19 — Implement the signed sync protocol  (P1, after Task-01)
- **Files:** `endpoints/sync.py`, `services/sync_service.py`, `core/server_identity.py`, new migration.
- **Steps:** Implement the protocol described in `ARCHITECTURE_REVIEW.md` §5:
  1. Add `sync_secret` (32-byte hex) to `ServerIdentity` at registration; store hashed is **not** possible (we need it to sign) — store encrypted at rest with the app secret, or rely on filesystem perms.
  2. `process_queue`: batch pending rows, canonical-JSON each, HMAC sign, POST to `${vps_url}/api/v1/sync/receive` with the three headers; mark `SENT` + delivery token; handle ACKs.
  3. `/sync/receive`: verify (already stubbed in Task-01), dedupe by `(table_name, record_id, operation, payload_hash)`, apply within a transaction, emit ACK.
  4. Conflict policy: last-write-wins for non-financial; financial is append-only.
- **Testing:** Round-trip test with two test servers; assert idempotency on replay.

---

### Task-20 — Migrate finance numbering to `number_sequences`  (P2, after Task-07)
- **File:** `backend/app/services/finance_service.py:74-80, 236-242, 296-302`.
- **Steps:**
  1. Extend `id_service.PREFIX_MAP` with `"entry": "JE", "invoice": "INV", "payment": "PAY"`.
  2. Replace the three `_next_*_number` bodies with calls to `id_service.generate_id(db, "entry"/"invoice"/"payment", school_id)`.
  3. Preserve the `{PREFIX}-{YEAR}-{NNNNN}` format (already matched).
- **Testing:** Existing finance tests; concurrency test for invoice numbers.

---

### Task-21 — Operational performance pack  (P2)
- **21a.** `backend/Dockerfile`: change CMD to `uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2}`; update `docker-compose.yml` to set `WEB_CONCURRENCY`.
- **21b.** Seed default GL accounts in `license_service.initialize_system`/`activate_system`; remove auto-create from `_create_payment_journal_entry` / `_create_wallet_journal_entry` (or keep as logged fallback).
- **21c.** `license_crypto.get_cached_license_status`: serve last-known-good from Redis; refresh asynchronously; never block a request on `_can_reach_license_server`.
- **21d.** Add composite indexes (migration): `idx_invoices_school_due(school_id, due_date desc)`, `idx_journal_lines_account(account_id)`, `idx_attendance_student_status(student_id, status)`, `idx_payments_school_invoice(school_id, invoice_id)`, `idx_users_school_deleted(school_id, deleted_at)`.
- **Testing:** EXPLAIN ANALYZE before/after on the top queries; load test with `locust` or `wrk` if time permits.

---

### Task-22 — Clean up `branches.delete_branch` dead code  (P3)
- **File:** `backend/app/api/v1/endpoints/branches.py:117-119`.
- **Steps:** Delete line 117 (`branch.deleted_at = ...created_at.__class__()`); move `from datetime import datetime` to the top of the file.
- **Testing:** Existing branch tests; manual delete smoke.

---

### Task-23 — Single source of truth for token creation  (P3)
- **Files:** `core/security.py`, `services/auth_service.py`.
- **Steps:** Keep `create_access_token`/`create_refresh_token` only in `core/security.py`; in `auth_service.py`, replace the local defs with `from app.core.security import create_access_token, create_refresh_token, decode_token`.
- **Testing:** Auth tests still pass.

---

### Task-24 — Fix `verify_password` non-standard kwarg  (P3)
- **File:** `backend/app/core/security.py:12-17`.
- **Steps:** Remove `switchable=True`; verify passlib version in `requirements.txt` (≥1.7.4). Add a unit test hashing and verifying a known password.
- **Testing:** `test_password_hash.py`.

---

### Task-25 — Test scaffolding  (P1, do early — enables verification of all other tasks)
- **Files:** new `backend/tests/test_role_matrix.py`, `test_tenant_isolation.py`, `test_audit_atomicity.py`, `test_cafeteria_concurrency.py`, `test_id_sequence_concurrency.py`, `test_security_headers.py`.
- **Steps:** Scaffold these with fixtures: two schools, users per role, a soft-deleted sample, a student per school. Provide a `conftest.py` with an in-memory or transactional Postgres fixture.
- **Testing:** Themselves.

---

### Task-26 — Commit & track untracked migrations  (P3)
- **Files:** `backend/alembic/versions/73ccf4e21e6d_*.py`, `9e8f7a6b5c4d3e2f_*.py`, `a7b9c1d2e3f4a5b6_*.py`, `b8c9d0e1f2a3b4c5_*.py`, `cf5da0e968b4_*.py`, `d1e2f3a4b5c6d7e8_*.py`.
- **Steps:** `git add` them; verify the Alembic chain (`alembic history`) is linear; fix down_revision pointers if broken.
- **Testing:** `alembic upgrade head` then `alembic downgrade base` on a fresh DB without error.

---

## Suggested Execution Order (first pass)

1. **Task-09** (SECRET_KEY) — unblocks safe testing.
2. **Task-05** (audit commit) — foundational correctness.
3. **Task-25** (tests) — enables verification.
4. **Task-02, 03, 04, 06** (security/data P0 fixes).
5. **Task-01** (sync stub hardening) — buys time for Task-19.
6. **Task-07, 08, 13** (concurrency + tenant + view-only).
7. **Task-10, 11, 12** (hardening).
8. **Task-14, 15, 16, 20, 21** (scale + integrity).
9. **Task-17, 18, 19, 22, 23, 24, 26** (tech debt + real sync).

After P0 is done, re-run the full suite, update `docs/REVIEWS.md` "Fixes Applied" table, and bump `docs/PRODUCTION_READINESS.md` score.
