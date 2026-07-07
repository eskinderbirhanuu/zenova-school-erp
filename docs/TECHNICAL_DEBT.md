# Technical Debt — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

**Updated:** 2026-07-07 · **Lead Software Architect (AI-Agent)** · **Security fixes + schema precision fixes applied.**

---

## Resolved in this Cycle (2026-07-07)

### Settings PUT privilege overflow
- **File:** `backend/app/api/v1/endpoints/settings.py`
- **Fix:** Added `require_permission(Permission.SETTINGS_MANAGE)` to PUT endpoint.
- **Status:** RESOLVED

### Card design IDOR
- **File:** `backend/app/api/v1/endpoints/card_design.py`
- **Fix:** Added `school_id` ownership validation.
- **Status:** RESOLVED

### Branches PATCH/DELETE missing permission
- **File:** `backend/app/api/v1/endpoints/branches.py`
- **Fix:** Added `require_permission(Permission.SCHOOL_MANAGE)` and `log_audit`.
- **Status:** RESOLVED

### Corporate endpoints cross-tenant leak
- **File:** `backend/app/api/v1/endpoints/corporate.py`
- **Fix:** Gated behind `CORPORATE_EMPLOYEE_VIEW` / `CORPORATE_DEPARTMENT_MANAGE`.
- **Status:** RESOLVED (endpoint layer; schema-level `school_id` deferred)

### NFC by-card cross-tenant lookup
- **File:** `backend/app/services/nfc_v2_service.py`, `backend/app/api/v1/endpoints/nfc_v2.py`
- **Fix:** Added `school_id` filter in service functions and endpoints.
- **Status:** RESOLVED

### Parent payments refund endpoints
- **File:** `backend/app/api/v1/endpoints/parent_payments.py`, `backend/app/services/parent_payment_service.py`
- **Fix:** Added payment ownership validation and `school_id` filter.
- **Status:** RESOLVED

### Platform/IGA global exposure
- **Files:** `backend/app/api/v1/endpoints/platform_commission.py`, `backend/app/api/v1/endpoints/iga.py`
- **Fix:** Added `require_permission(Permission.AUDIT_VIEW)`.
- **Status:** RESOLVED

### Setup/Installer rate limits
- **Files:** `backend/app/api/v1/endpoints/setup.py`, `backend/app/api/v1/endpoints/installer.py`
- **Fix:** Added `SETUP_*_LIMIT` and `INSTALLER_*_LIMIT` dependencies.
- **Status:** RESOLVED

### Sync HMAC body signing
- **File:** `backend/app/api/v1/endpoints/sync.py`
- **Fix:** HMAC now signs `{server_id}.{ts}.{body_hash}` with backward compatibility.
- **Status:** RESOLVED

### Telegram webhook signature
- **File:** `backend/app/api/v1/endpoints/telegram.py`
- **Fix:** Added HMAC-SHA256 verification using bot token.
- **Status:** RESOLVED

### Global exception handler
- **File:** `backend/app/main.py`
- **Fix:** Added `@app.exception_handler(Exception)` that redacts stack traces in non-dev environments.
- **Status:** RESOLVED

### Float money in schemas
- **Files:** `backend/app/schemas/finance.py`, `cafeteria.py`, `hr.py`, `inventory.py`, `library.py`
- **Fix:** Replaced `float` with `Decimal` for all money fields.
- **Status:** RESOLVED

---

## Remaining Debt

Debt register. Each entry:

```
### File
### Debt Description
### Why It Matters
### Refactoring Suggestion
```

Severity is implicit in ordering (top = most consequential). Task IDs reference `DEEPSEEK_TASKS.md`.

---

### 1. `backend/app/main.py` + `alembic/`
- **Debt:** `Base.metadata.create_all` runs at startup while Alembic migrations coexist. 9 migration files, several untracked (`73ccf4e21e6d_add_sync_queue`, `9e8f7a6b5c4d3e2f_add_deleted_at_to_all_remaining_tables`, `a7b9c1d2e3f4a5b6_add_school_id_remaining`, `b8c9d0e1f2a3b4c5_add_server_identity`, `cf5da0e968b4_add_idempotency_key_to_payments`, `d1e2f3a4b5c6d7e8_add_school_id_child_tables`).
- **Why It Matters:** Schema drift; the live schema may not match any migration; upgrades become unsafe; the "models missing deleted_at" issue persists undetectably.
- **Refactoring:** Alembic-only in production; commit all migration files; add a CI check that `alembic upgrade head` on a fresh DB matches `Base.metadata`. [T-14 / T-26]

---

### 2. `backend/app/core/audit.py`
- **Debt:** `log_audit` self-commits, breaking unit-of-work. ~80 call sites depend on the side effect.
- **Why It Matters:** Transactional integrity across finance/HR/academic; audit can outlive the transaction it describes.
- **Refactoring:** [T-05].

---

### 3. `backend/app/core/permissions.py`
- **Debt:** Dual enforcement (`require_role` vs `PermissionChecker`); `Role.level` stored but unused.
- **Why It Matters:** Authz gaps (`is_view_only` bypass), maintenance burden.
- **Refactoring:** [T-17].

---

### 4. `backend/app/services/finance_service.py` (numbering)
- **Debt:** Three `_next_*_number` helpers using `count()+1` + `LIKE`.
- **Why It Matters:** Races (duplicate numbers), perf (scans).
- **Refactoring:** [T-20].

---

### 5. ~54 models lacking `deleted_at`
- **Debt:** The auto soft-delete filter only protects entities that have the column. Migration `9e8f7a6b5c4d3e2f` intends to add it but is untracked and may be unapplied.
- **Why It Matters:** Violates "no hard delete" core rule; data loss.
- **Refactoring:** [T-14].

---

### 6. `backend/app/api/v1/endpoints/sync.py` + `services/sync_service.py`
- **Debt:** Sync is a half-built stub (`/sync/receive` is unauthenticated and does nothing; `process_queue` is partial; `VPS_SYNC_ENABLED=False`).
- **Why It Matters:** The headline hybrid-cloud feature is non-functional; the stub is an attack surface.
- **Refactoring:** [T-01 / T-19].

---

### 7. `backend/app/api/v1/endpoints/parent_portal.py`
- **Debt:** `parent_make_payment` calls `finance_service.record_payment` with a wrong signature → 500s.
- **Why It Matters:** Cloud payments broken.
- **Refactoring:** [T-04].

---

### 8. `backend/app/api/v1/endpoints/branches.py:117-119`
- **Debt:** Dead/confusing two-line `deleted_at` assignment.
- **Why It Matters:** Readability; risk of someone "fixing" the wrong line.
- **Refactoring:** [T-22].

---

### 9. Token creation duplicated
- **Debt:** `create_access_token`/`create_refresh_token` exist in both `core/security.py` and `services/auth_service.py`.
- **Why It Matters:** Drift risk in jti/exp/claims.
- **Refactoring:** [T-23].

---

### 10. `backend/app/services/academic_service.py:411`
- **Debt:** `promote_student` and likely a handful of other service fetches omit the `school_id` tenant filter.
- **Why It Matters:** Cross-tenant IDOR.
- **Refactoring:** [T-08] + tenant-filter sweep.

---

### 11. `backend/app/core/security.py:15`
- **Debt:** Non-standard `switchable=True` arg to `pwd_context.verify`.
- **Why It Matters:** Silent fallback on passlib version change.
- **Refactoring:** [T-24].

---

### 12. `backend/app/services/license_crypto.py`
- **Debt:** `_can_reach_license_server` does a synchronous 5s outbound HTTP ping inside request path when cache expires; `OFFLINE_GRACE_DAYS` hardcoded (also in `config` as `license_offline_grace_days` — duplicated).
- **Why It Matters:** Periodic user-facing stalls; offline UX regression.
- **Refactoring:** [T-21c].

---

### 13. `backend/app/api/v1/endpoints/students.py` (transcript)
- **Debt:** ~100-line inline business logic assembling transcripts in the endpoint.
- **Why It Matters:** Untestable, N+1, duplicated grade logic.
- **Refactoring:** Extract `transcript_service.build(db, student_id, school_id)`. [T-16]

---

### 14. `backend/app/main.py` CORS list
- **Debt:** Hardcoded IPs (`192.168.1.5:3000`) baked into source for "access from phone".
- **Why It Matters:** Per-deployment config leaking into code; the historical "wildcard CORS" was a workaround for this.
- **Refactoring:** Configure strictly via `ALLOWED_ORIGINS` env; remove hardcoded IPs. [T-12]

---

### 15. `backend/tests/`
- **Debt:** Single test file (`test_finance_security.py`); no role matrix, no tenant-isolation, no concurrency, no sync/license tests.
- **Why It Matters:** Regressions (several already documented in `docs/REVIEWS.md`) are caught only manually.
- **Refactoring:** [T-25].

---

### 16. `docker-compose.yml` / `backend/Dockerfile`
- **Debt:** Compose ships default `SECRET_KEY` and dev `ENVIRONMENT`; Dockerfile runs a single uvicorn worker and `COPY . .` (no layer caching for code changes, though requirements are cached).
- **Why It Matters:** Footguns for production deploy; underperformance.
- **Refactoring:** [T-09 / T-21a].

---

### 17. Frontend (per `docs/REVIEWS.md` contradictions)
- **Debt:** Sidebar nav hardcoded in two places (`sidebar.tsx` + `config/navigation.ts`); `RoleLayout` vs raw `Sidebar`; `Finance` vs `FINANCE` case via `normalizeUser()`.
- **Why It Matters:** UI drift, data-quality risk.
- **Refactoring:** Single source of truth for nav + role casing; (out of scope for backend DeepSeek tasks — flag for frontend pass).

---

### 18. `Role.level: Optional[str]` in `schemas/user.py:32`
- **Debt:** `RoleResponse.level` is typed `Optional[str]` but `Role.level` is conceptually an int (10–100).
- **Why It Matters:** Type drift; if `level` is ever used for enforcement, string comparison breaks it.
- **Refactoring:** Type as `Optional[int]`; add `ge=0, le=100`. [T-17].

---

### 19. `number_sequences` lacks uniqueness guarantee
- **Debt:** No DB `UNIQUE(prefix, school_id, year)`; the locked-update path assumes a row exists.
- **Why It Matters:** First-of-year race (AI-7).
- **Refactoring:** [T-07].

---

### 20. Unbounded/implicit scopes in portal queries
- **Debt:** `parent_portal`/`student_portal` queries filter by relationship-derived ids but omit explicit `school_id` and `deleted_at` filters (the soft-delete auto-filter helps only where the column exists).
- **Why It Matters:** Defense-in-depth gap.
- **Refactoring:** Add explicit tenant + soft-delete filters. [T-08].
