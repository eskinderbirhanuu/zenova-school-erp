# Security Audit — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

Findings are ordered by risk. Each entry follows:

```
### Vulnerability
### Risk Level: Critical | High | Medium | Low
### Attack Scenario
### Recommended Fix
### Production Impact
```

Implementation steps live in `DEEPSEEK_TASKS.md` (Task IDs referenced as `[T-NN]`).

---

## §1 — Critical Vulnerabilities

### Vulnerability 1.1 — Unauthenticated cloud→local sync ingestion
**Risk Level:** Critical · **Location:** `backend/app/api/v1/endpoints/sync.py:28-33` · **Task:** [T-01]

```python
@router.post("/sync/receive")
def receive_sync(data: dict, db: Session = Depends(get_db)):
    return {"received": True, "data": data}
```

**Attack Scenario**
The endpoint has neither `get_current_user` nor any signature/shared-secret check. It is registered in `router.py`. Today it is a no-op echo, but it is the documented cloud→local ingestion surface. The moment ingestion logic is added, any attacker who can reach the local server (`http://192.168.x.x:8000`) can POST arbitrary JSON to write student/finance records, or abuse the endpoint for amplification/reconnaissance. Even now it confirms "server alive" and accepts unlimited payloads (no size cap).

**Recommended Fix**
- Require a per-deployment **sync secret** generated at server registration, stored hashed in `server_identity`.
- Verify `HMAC-SHA256(secret, canonical_json(body) + timestamp)` via header `X-Zenova-Sync-Sig`; reject on mismatch (constant-time).
- Enforce a ±60s replay window on a `X-Zenova-Sync-Ts` header.
- Only accept if the caller's registered `server_role` is `VPS` or the local box is `MAIN_SCHOOL`/`BRANCH` expecting pushes.
- Rate-limit and audit every receive.
- Until the real ingestion exists, return `404` to avoid advertising the surface.

**Production Impact:** If ingested naively → total remote record injection / data poisoning of a school's DB.

---

### Vulnerability 1.2 — Path traversal in backup download & delete
**Risk Level:** Critical · **Location:** `backend/app/api/v1/endpoints/backup.py:33-52` · **Task:** [T-02]

```python
filepath = os.path.join(backup_service.BACKUP_DIR, filename)   # filename is raw user input
if not os.path.exists(filepath): raise ...
return FileResponse(filepath, ...)                              # arbitrary read
# delete route:
backup_service.delete_backup(filename)                          # arbitrary delete
```

**Attack Scenario**
Any authenticated user (the route only requires `get_current_user`, i.e. **any role including PARENT/STUDENT**) requests:
`GET /api/v1/backums/..%2F..%2F..%2Fapp%2F.env/download` → reads `SECRET_KEY`, DB password, SMTP creds.
`DELETE /api/v1/backups/../../../../etc/zenova/license.lic` → bricks the license.
`os.path.join` does not sanitize `..`, and `FileResponse` happily serves resolved paths.

**Recommended Fix**
- Validate `filename` against `^[A-Za-z0-9_.-]{1,128}$`.
- Compute `resolved = os.path.realpath(os.path.join(BACKUP_DIR, filename))` and assert `os.path.commonpath([resolved, os.path.realpath(BACKUP_DIR)]) == os.path.realpath(BACKUP_DIR)`.
- Gate both routes behind `SUPER_ADMIN` only (`PermissionChecker(SCHOOL_MANAGE)` is too broad).
- Audit-log every download/delete with user_id + IP.
- Ensure `BACKUP_DIR` is configured and **not** under the app source tree.

**Production Impact:** Credential disclosure + ransomware-grade destructive delete.

---

### Vulnerability 1.3 — License key = universal account-takeover token
**Risk Level:** Critical · **Location:** `backend/app/api/v1/endpoints/activate.py:286-309` · **Task:** [T-03]

```python
@router.post("/activate/reset-password")
def reset_password(data, db, _=Depends(RESET_PASSWORD_LIMIT)):
    user = db.query(User).filter(User.employee_id == data.employee_id).first()
    lic  = db.query(License).filter(License.key == data.license_key).first()
    if lic.status != ACTIVE: raise ...
    if user.school_id and lic.school_id and user.school_id != lic.school_id: raise ...
    user.hashed_password = get_password_hash(data.new_password)   # bypasses bcrypt check
```

**Attack Scenario**
The school's license key is shared widely (it is needed for activation and is shown to directors/admins). Any holder of the key can reset **the ADMIN's** password by supplying the ADMIN's `employee_id` (also semi-public) and a new password. The only guard is same-school, which the attacker already satisfies. Rate limit is 5/15min — trivially slow-bruteforceable across keys, and not even needed since the key is known.

**Recommended Fix**
- **Remove the endpoint** OR replace with the already-implemented `core/security.issue_password_recovery_code` flow: an **authenticated admin** mints a TTL-bound HMAC code for a specific `user_id`; the public reset endpoint consumes it for that user only.
- If license-based recovery must stay for offline scenarios, require it **plus** a TOTP/SMS OTP seeded at activation, and restrict target roles to non-admin staff.
- Never allow resetting a user whose `is_superuser` is True via this path.

**Production Impact:** Full school takeover (finance, grades, PII) by any low-trust insider.

---

### Vulnerability 1.4 — Cloud payment path crashes (signature drift)
**Risk Level:** Critical (availability) · **Location:** `backend/app/api/v1/endpoints/parent_portal.py:156-164` · **Task:** [T-04]

```python
payment = finance_service.record_payment(
    db=db, data=data, payment_number=payment_number,
    received_by=current_user.id, school_id=..., branch_id=...)
```
But the service signature is `record_payment(db, school_id, data, user_id)` (`finance_service.py:305`) — `payment_number`, `received_by`, `branch_id` are not parameters.

**Attack Scenario / Impact**
Every parent payment attempt raises `TypeError: unexpected keyword argument 'payment_number'` → HTTP 500. The entire parent-portal payment funnel is non-functional. Depending on session teardown, partial `Payment` rows may also be left uncommitted/committed inconsistently.

**Recommended Fix**
- Align call to `finance_service.record_payment(db, current_user.school_id, data, current_user.id)`.
- If a parent-supplied payment number is desired, extend the service signature deliberately and add a unit test asserting parent→service→GL posting succeeds end-to-end.
- Add an integration test that posts a real Chapa-style payment through the portal.

**Production Impact:** 100% failure of online fee collection.

---

## §2 — High-Risk Vulnerabilities

### Vulnerability 2.1 — `log_audit` commits inside caller transactions
**Risk Level:** High · **Location:** `backend/app/core/audit.py:6-30` · **Task:** [T-05]

`log_audit()` calls `db.commit()`. It is invoked inside services that themselves commit (e.g. `finance_service.record_payment` calls `log_audit` *before* its own `db.commit()` in some paths, and `cafeteria_service.create_order` calls it before `db.commit()`). Effect: business writes are flushed early, and the audit row persists even if the caller later raises — the audit trail can describe transactions that never completed.

**Recommended Fix**
Remove `db.commit()` from `log_audit`; make it `db.add()` only. Callers own the commit. Provide `log_audit_and_commit(db, ...)` for standalone use. Sweep ~80 call sites.

**Production Impact:** Ledger/audit desync; unreconstructable history; violates "everything traceable" core rule.

---

### Vulnerability 2.2 — Cafeteria stock & wallet race (no row locks)
**Risk Level:** High · **Location:** `backend/app/services/cafeteria_service.py:21-38` · **Task:** [T-06]

`create_order` reads `product.stock`, decrements, writes back without `with_for_update()`. Concurrent orders for the last unit both succeed. If wallet payment is added later, same flaw for `Wallet.balance`.

**Recommended Fix**
- `db.query(CafeteriaProduct).filter(...).with_for_update()` per item, re-check stock.
- Or atomic `UPDATE cafeteria_products SET stock = stock - :qty WHERE id = :id AND stock >= :qty` and assert `rowcount == 1`.
- Wrap the whole order (stock + wallet + audit) in one transaction; commit once.

**Production Impact:** Oversell, negative stock, double-spent wallets.

---

### Vulnerability 2.3 — Cross-tenant IDOR in `promote_student`
**Risk Level:** High · **Location:** `backend/app/services/academic_service.py:411-414` · **Task:** [T-08]

```python
student = db.query(StudentModel).filter(StudentModel.id == student_id).first()  # no school_id!
```
`school_id` is passed and used for the `PromotionRecord`, but the student fetch has no tenant filter.

**Recommended Fix**
Add `.filter(StudentModel.school_id == school_id)`. Run the IDOR checklist (§10) across all services.

**Production Impact:** Cross-school academic-record tampering.

---

### Vulnerability 2.4 — Default SECRET_KEY shipped; weak prod guard
**Risk Level:** High · **Location:** `backend/app/config.py:9,46-49`, `docker-compose.yml:37` · **Task:** [T-09]

`secret_key` defaults to `"dev-secret-key"`. `validate()` only enforces a non-default in `environment=="production"`, which is not the default and is often forgotten. With HS256 + the default key, an attacker **forges a SUPER_ADMIN JWT** (`{"sub":<id>,"role":"SUPER_ADMIN","type":"access"}`) and owns the system.

**Recommended Fix**
- Remove the default; require `SECRET_KEY` env in all environments.
- Startup-assert: reject known defaults and any key < 32 bytes of entropy.
- On first run with no key, generate one, write to `.env`, log a loud warning.
- Strip the value from `docker-compose.yml`.

**Production Impact:** Total auth bypass on misconfigured deploys.

---

### Vulnerability 2.5 — File uploads: no size/type limits, stored XSS vector
**Risk Level:** Medium-High · **Location:** `students.py:357-397` and all `UploadFile` routes · **Task:** [T-11]

`content = file.file.read()` reads entire body into RAM; `file_type = file.content_type` is attacker-controlled and later served. Uploads land under `uploads/students/{id}/...` relative to CWD.

**Recommended Fix**
- Global `Content-Length` cap (e.g. 10 MB) + per-route override.
- Stream to disk in chunks; reject on overflow.
- Whitelist extensions and magic bytes (`pdf,jpg,png,docx`).
- Serve via a controlled endpoint with `Content-Disposition: attachment` and a safe `Content-Type`, never inline; store outside web root.

**Production Impact:** Worker OOM, disk exhaustion, stored XSS.

---

### Vulnerability 2.6 — `is_view_only` bypassed by `require_role`
**Risk Level:** Medium · **Location:** `backend/app/core/permissions.py:83-93` · **Task:** [T-13]

`require_role("FINANCE")` checks only `role.name == "FINANCE"`, ignoring `is_view_only`. Most finance/HR/inventory mutation routes use `require_role`, so an outside-network user (auto-flagged view-only) can still mutate.

**Recommended Fix**
Make `require_role` consult `has_permission` (which honors `is_view_only`), or migrate mutation routes to `PermissionChecker`.

**Production Impact:** "View-only outside network" core rule is silently broken.

---

## §3 — Medium / Hardening

### Vulnerability 3.1 — Refresh endpoint lacks rate limiting
**Risk Level:** Medium · `auth.py:242` · [T-10]. Add `AUTH_RATE_LIMIT` + per-user refresh cap.

### Vulnerability 3.2 — CSP `unsafe-eval`; possible CORS regression
**Risk Level:** Medium · `main.py:44-52` · [T-12]. Drop `unsafe-eval` in prod; add startup assertion no `*` origin. Current `main.py` has single strict CORS (the "double CORS" in docs/SECURITY.md appears resolved — keep a regression test).

### Vulnerability 3.3 — PII unencrypted at rest & in responses
**Risk Level:** Medium. `students`/`parents` store DOB, blood group, national/passport/kebele IDs, medical notes, emergency contacts in plaintext; responses return them verbatim. Apply column-level encryption (PGcrypto / app-layer `cryptography`) for national IDs and medical notes; mask in non-privileged responses. Add a `PII_RETENTION`/purge job for soft-deleted records.

### Vulnerability 3.4 — `get_client_ip` trusts `X-Forwarded-For` blindly
**Risk Level:** Medium · `deps.py:8-12`. If the backend is ever directly exposed (not behind Nginx that overwrites the header), clients spoof IPs to dodge brute-force (`_check_brute_force`) and rate limits. Trust only configured proxy hops; otherwise use `request.client.host`.

### Vulnerability 3.5 — No MFA for finance / super-admin
**Risk Level:** Medium. Add TOTP for SUPER_ADMIN, ADMIN, FINANCE. JWT currently has no step-up.

### Vulnerability 3.6 — Soft-delete missing on ~54 models
**Risk Level:** Medium · [T-14]. The auto `before_compile` filter only applies where `deleted_at` exists; other models hard-delete or can't be deleted. Confirmed migration exists (`9e8f7a6b...`) but untracked — verify it is applied.

### Vulnerability 3.7 — `decode_access_token` catches all exceptions
**Risk Level:** Low · `core/security.py:79-84`. Broad `except Exception` masks misconfig (e.g. wrong algorithm). Log the exception class while still returning None to callers.

### Vulnerability 3.8 — WebSocket does not re-validate revocation
**Risk Level:** Low · `ws.py:8-25` · [T-18]. Re-check `jti` blacklist periodically on long-lived sockets.

### Vulnerability 3.9 — `verify_password` passes non-standard `switchable=True`
**Risk Level:** Low · `core/security.py:15`. Confirm passlib version accepts this; otherwise it may silently fall through. Add a unit test with a known hash.

### Vulnerability 3.10 — Setup/activation endpoints allow first-write without auth
**Risk Level:** Medium (accepted by design) · `setup.py:82-115`, `activate.py:120-239`. These are intentionally public for first boot but are protected only by rate limits + "already initialized" checks. Ensure: (a) once `is_setup_complete=True`, all such endpoints 409/403; (b) `ACTIVATE_INIT_LIMIT` (3/hour) is enforced on a per-IP **and** global basis; (c) audit-log every attempt. The `initialize-main` path trusts the license key as a pre-shared secret — acceptable if keys are single-use and bound on first activation (they are: `bind_license_to_hardware`). Verify a MAIN key cannot initialize twice.

### Vulnerability 3.11 — `parent_portal` fetches children without school_id filter
**Risk Level:** Medium · `parent_portal.py:42`. `db.query(Student).filter(Student.id == sid)` — `sid` comes from `ParentStudentLink` of the authenticated parent, so it is implicitly scoped, but add an explicit `Student.school_id == parent.school_id` and `Student.deleted_at.is_(None)` defense-in-depth. Same for the attendance/invoice/grade sub-queries (they filter by `student_id` only).

---

## §4 — Areas Reviewed & Verdict

| Area | Status | Notes |
|------|--------|-------|
| Authentication (JWT, bcrypt, reset) | ⚠️ Good base, gaps | Refresh not rate-limited; default secret; reset-by-license critical |
| Authorization (RBAC) | ⚠️ Two systems | `require_role` ignores `is_view_only` |
| Multi-tenant isolation | ⚠️ Mostly good | Recent fixes solid; `promote_student` + a few portal queries leak |
| License system | ✅ Crypto sound | RSA-PSS signed `.lic`; fingerprint 75% tolerance reasonable. Reset-by-license is the flaw, not the crypto |
| Chapa / payments | ❌ Broken | Parent path crashes (1.4) |
| Parent / Student portal | ⚠️ | Implicit scoping; add explicit school_id |
| File uploads | ❌ | No limits, XSS vector |
| Docker / env | ⚠️ | Default secrets in compose |
| Sync | ❌ | Unauthenticated `/sync/receive` |
| Backups | ❌ | Path traversal |
| CSRF | ✅ | Double-submit cookie implemented correctly |
| Audit logging | ⚠️ | Self-commit breaks atomicity |

**Overall security posture:** The cryptographic primitives (bcrypt, HS256, RSA-PSS license signing, HMAC recovery codes) are correctly chosen and used. The problems are **operational wiring**: a few unauthenticated endpoints, a path-traversal, a password-reset design flaw, an unused security flag (`is_view_only`), and missing input limits. All are fixable without re-architecting. Resolving the Critical/High items in `DEEPSEEK_TASKS.md` brings the system to a defensible baseline.
