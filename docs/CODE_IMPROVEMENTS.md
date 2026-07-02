# Code Improvements — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

Refactoring opportunities (non-security, non-perf) that improve maintainability. Each entry:

```
### File
### Current Implementation
### Recommended Implementation
### Reason
### Potential Risks
### Suggested Refactoring
```

Task numbers reference `DEEPSEEK_TASKS.md`.

---

### 1. `backend/app/core/audit.py`
- **Current:** `log_audit()` commits internally and silently swaps `description` into `new_data` when `new_data` is None (`new_data=new_data if new_data is not None else description`).
- **Recommended:** Make it `db.add()` only (no commit). Give `description` its own column (or always wrap into `new_data={"description": description}`) so the data shape is predictable.
- **Reason:** Transaction integrity + clean audit schema (AI-5).
- **Risks:** Callers that relied on the auto-commit will stop persisting the audit row if they themselves don't commit. Mitigate with a `log_audit_and_commit` helper and a sweep.
- **Refactoring:** [T-05] — sweep ~80 call sites; add tests asserting audit rows commit with the business write.

---

### 2. `backend/app/core/permissions.py` + `deps.py`
- **Current:** Two enforcement systems (`require_role` string match, `PermissionChecker` codes); `Role.level` unused; `is_view_only` honored in one only.
- **Recommended:** Single decorator family:
  ```python
  def require(*perms): ...            # granular
  def require_level(level): ...       # hierarchy fallback
  def require_role(name): ...         # thin wrapper calling has_permission
  ```
  All three consult `has_permission`, which honors `is_superuser` and `is_view_only`.
- **Reason:** Authz clarity + closes the view-only bypass (Security 2.6).
- **Risks:** Some routes currently pass under `require_role` but would now be blocked by `is_view_only`. That is the *intended* behavior; verify with role-matrix tests.
- **Refactoring:** [T-17].

---

### 3. `backend/app/services/finance_service.py` (numbering)
- **Current:** Three near-identical `_next_*_number` functions using `count()+1` with a `LIKE` prefix.
- **Recommended:** Route all through `id_service.generate_id` after extending its `PREFIX_MAP` to `entry/invoice/payment` and fixing the first-insert race.
- **Reason:** DRY + race-free + indexable.
- **Risks:** Existing number formats must be preserved (`JE-YYYY-NNNNN`, `INV-YYYY-NNNNN`, `PAY-YYYY-NNNNN`) — confirm prefix/year/zero-pad parity.
- **Refactoring:** [T-20].

---

### 4. `backend/app/services/finance_service.py` (`record_payment` / `wallet_transaction`)
- **Current:** GL auto-creates default accounts (`Cash on Hand`, `Student Fees Receivable`, `Customer Deposits`) inside the hot path.
- **Recommended:** Seed at school setup; remove auto-create or demote to a logged fallback.
- **Reason:** Predictable GL + faster payments.
- **Risks:** Legacy schools without those accounts would fail until seeded — ship a one-time backfill migration.
- **Refactoring:** [T-21b].

---

### 5. `backend/app/api/v1/endpoints/parent_portal.py:156`
- **Current:** Calls `finance_service.record_payment` with kwargs that don't exist on the service.
- **Recommended:** Align to `record_payment(db, school_id, data, user_id)`; if a parent-supplied number is desired, change the service signature intentionally.
- **Reason:** Cloud payment path is broken (AI-4).
- **Risks:** None — current code cannot work.
- **Refactoring:** [T-04].

---

### 6. `backend/app/database.py`
- **Current:** `before_compile` soft-delete filter inspects `query.column_descriptions` and filters entities that have `deleted_at`.
- **Recommended:** Keep it, but (a) unit-test that it doesn't double-filter when the caller already added `deleted_at IS NULL`, and (b) expose `include_deleted=True` via a documented helper. Also ensure all business models actually have the column (AI-14).
- **Reason:** The mechanism is excellent but only as good as column coverage.
- **Risks:** Low. Add a test matrix.
- **Refactoring:** [T-14].

---

### 7. `backend/app/api/v1/endpoints/branches.py:117-119`
- **Current:** Dead/confused code:
  ```python
  branch.deleted_at = db.query(Branch).filter(Branch.id == branch_id).first().created_at.__class__()
  from datetime import datetime
  branch.deleted_at = datetime.utcnow()
  ```
  The first line constructs a `datetime` from the created_at class (pointless) and is immediately overwritten.
- **Recommended:** Delete the first line; keep `branch.deleted_at = datetime.utcnow()` (move the import to the top of the file).
- **Reason:** Dead code; confusing.
- **Risks:** None.
- **Refactoring:** [T-22].

---

### 8. `backend/app/services/academic_service.py:411`
- **Current:** `promote_student` fetches the student without a `school_id` filter.
- **Recommended:** Add `StudentModel.school_id == school_id`.
- **Reason:** IDOR (AI-8).
- **Risks:** None.
- **Refactoring:** [T-08].

---

### 9. `backend/app/api/v1/endpoints/backup.py`
- **Current:** Filename joined unsanitized into `BACKUP_DIR`.
- **Recommended:** Regex + `realpath`/`commonpath` containment check; SUPER_ADMIN-only; audit-log.
- **Reason:** Path traversal (AI-2).
- **Risks:** None.
- **Refactoring:** [T-02].

---

### 10. `backend/app/services/id_service.py`
- **Current:** `with_for_update()` only on the existing-row path; first-of-year insert races.
- **Recommended:** Add `UNIQUE(prefix, school_id, year)` and retry-on-integrity-error, or `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.
- **Reason:** Duplicate IDs (AI-7).
- **Risks:** Migration adds a constraint that could fail if dupes already exist — backfill/dedupe first.
- **Refactoring:** [T-07].

---

### 11. `backend/app/api/v1/endpoints/auth.py` + `services/auth_service.py`
- **Current:** Token creation logic is duplicated in `core/security.py` and `auth_service.py` (two `create_access_token` / `create_refresh_token` implementations).
- **Recommended:** Keep a single source in `core/security.py`; have `auth_service` re-export or call it.
- **Reason:** Avoid drift (jti/exp/format).
- **Risks:** Low; ensure all callers import from the same place.
- **Refactoring:** [T-23].

---

### 12. `backend/app/api/v1/endpoints/students.py` (and similar)
- **Current:** List endpoints repeat the `StudentResponse.model_validate(s)` mapping; transcript builds a huge dict inline.
- **Recommended:** Extract response builders into the schema (`@classmethod from_orm` or a `to_response()`), and move transcript assembly into a `transcript_service`.
- **Reason:** Thin endpoints, testable services.
- **Risks:** Low.
- **Refactoring:** P3 — opportunistic.

---

### 13. `backend/app/core/security.py:15`
- **Current:** `pwd_context.verify(plain_password, hashed_password, switchable=True)` — `switchable` is not a standard passlib `verify` kwarg.
- **Recommended:** Drop `switchable=True`; add a unit test with a known bcrypt hash.
- **Reason:** Avoid silent fallback / version surprise.
- **Risks:** Low.
- **Refactoring:** [T-24].

---

### 14. `backend/app/main.py` (middleware order)
- **Current:** Three middlewares + an `@app.middleware("http")` decorator added in a specific order. CORS is added first (outermost), then `SecurityHeaders`, then `CSRF`, then `watermark` via decorator (innermost). Starlette executes middleware in reverse-add order for request and add order for response.
- **Recommended:** Add an inline comment documenting the expected order and a test asserting security headers + CSRF behavior on a representative route.
- **Reason:** Middleware ordering bugs are subtle and regress silently (the historical "double CORS" was exactly this class).
- **Risks:** None.
- **Refactoring:** [T-12] (tests).

---

### 15. Tests
- **Current:** `backend/tests/` contains only `test_finance_security.py`. No coverage for auth, RBAC, multi-tenant isolation, sync, licensing, or the cafeteria/wallet flows.
- **Recommended:** Add a role-matrix test (every route × every role), a tenant-isolation test (school A cannot read school B), and a concurrency test for cafeteria/orders and ID sequences.
- **Reason:** The codebase is too large to harden by inspection alone.
- **Risks:** None.
- **Refactoring:** [T-25].
