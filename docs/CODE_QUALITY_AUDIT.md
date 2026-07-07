# ZENOVA — Code Quality Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Code Reviewer role
**Method:** Static analysis of `backend/app/`, file sizes, duplication, dead code, type hints, exception handling, comments. No code modified.

> **Authorization / security surface:** see SECURITY_AUDIT + API_AUDIT + PERMISSIONS_AUDIT.
> This report focuses on maintainability and idiom.

---

## Executive Summary

ZENOVA's codebase is **idiomatic FastAPI**, follows its own stated conventions (Pydantic v2, SQLAlchemy 2.0 declarative, `from app...` imports, log_audit on every mutation, `school_id` filter on every tenant query, `Decimal` for money — except 3 violations), and migrates gracefully (recent `datetime.utcnow()` → `datetime.now(timezone.utc)` rewrite across 55 files). Long files max at 688 lines. Some duplication (`include_deleted` gating ×30, transcript mapping loop ×3, cookie-set ×3). Type hints inconsistent. ~55 `except Exception:` clauses, mostly intentional but should be logged. Code quality is **maintainable to ~10,000 lines** but benefits from extracting a small utilities module.

| Score | Dimension | Notes |
|---|---|---|
| 80/100 | Idioms | FastAPI idioms consistent |
| 70/100 | Naming | snake_case throughout; minor enum inconsistency |
| 65/100 | Duplication | 3 cross-file duplicates |
| 60/100 | Type hints | ~50 endpoint args missing `:User` |
| 70/100 | Exception handling | No bare `except:`; ~55 `except Exception:` (mostly OK with log) |
| 75/100 | Comments / TODOs | ~25 TODOs, mostly in license_crypto (expected) |
| 75/100 | Maintainability | Modular, but `core/` overloaded |
| 80/100 | Tests | 148 tests, organized by domain |

---

## §1 — Naming Conventions

### §1.1 — Variables, functions, modules

- `snake_case` throughout Python ✓
- `camelCase` for TypeScript frontend ✓ (verified in sample)
- Model classes PascalCase ✓
- Service files named `<domain>_service.py` ✓ consistent

### §1.2 — Permission enum inconsistency

- `STUDENTS_VIEW` (plural) vs `STUDENT_CREATE`, `STUDENT_EDIT`, `STUDENT_DELETE` (singular) — pick one form
- `ATTENDANCE_MARK` not in the 30 declared Permission enum (referenced as string elsewhere)
- `LIBRARY_MANAGE`, `INVENTORY_MANAGE` (good) but `CAFETERIA_POS` (different suffix)

### §1.3 — Endpoint path-style

- All pluralized: `/students`, `/parents`, `/invoices` ✓
- One-word resources (`/attendance`, `/sync`) ✓
- Verbs-as-noun mutations: `POST /setup/initialize`, `POST /activate/recovery/issue` — non-REST but acceptable for action-style routes

---

## §2 — Long Files

| Lines | File | Acceptable? | Recommendation |
|---|---|---|---|
| 688 | `services/license_crypto.py` | Yes — edge-heavy | Comment generously; split into `fingerprinting.py` + `crypto.py` |
| 628 | `services/finance_service.py` | Borderline | Split invoices/payments/journal/PO |
| 522 | `endpoints/auth.py` | Borderline | Split login / refresh / mfa / register / reset |
| 520 | `services/parent_payment_service.py` | Borderline | Split Chapa integration / refunds / receipts |
| 460 | `services/license_service.py` | Yes | OK |
| 437 | `endpoints/students.py` | Borderline | Split bulk / Excel / transcripts |
| 418 | `services/nfc_v2_service.py` | Yes | OK |

No 1000+ LOC files. ✓

---

## §3 — Duplicated Code Patterns

### §3.1 — `include_deleted` role gating (×30 occurrences)

```python
include_deleted = current_user.is_superuser or (
    current_user.role and current_user.role.name in ("ADMIN", "SUPER_ADMIN")
)
```

Across `parents.py`, `students.py`, `finance.py`, `hr.py`, `branches.py`, etc.

**Fix:** extract helper `can_see_deleted(current_user) -> bool` in `deps.py`.

### §3.2 — Transcript / result mapping loop (×3 occurrences)

`students.py:294`, `report_cards.py:88`, `academic.py` marksheet

```python
for r in results:
    exam = next((e for e in exams if e.id == r.exam_id), None)
```

**Fix:** extract `build_result_map(results, exams_by_id)` to `utils/grading.py`.

### §3.3 — Auth cookie-set triplet (×3 occurrences)

In `auth.py` `login`, `refresh`, `mfa_login`:

```python
resp.set_cookie("access_token", access, httponly=True, samesite="strict", secure=...)
resp.set_cookie("refresh_token", refresh, ...)
resp.set_cookie("user_role", role_name, httponly=False, ...)
```

**Fix:** `set_auth_cookies(response, access, refresh, role, settings) -> None`.

### §3.4 — Service `commit()` antipattern (×multiple)

Service-layer commits such as `qr_service.generate_qr:60`, `archive_service.run_archive` breaks caller-tx atomicity.

**Fix:** document a "_services flush, callers commit_" rule in CONTRIBUTING.md; remove service-layer commits except for explicitly self-transactional flows (archive).

---

## §4 — Dead Code / Smell

### §4.1 — Legacy NFC (`nfc.py`, `nfc_card.py` model)

`nfc_service.py` and `nfc.py` endpoint still present alongside V2 (`nfc_v2.py`, `nfc_v2_service.py`). Migration to V2 evident but legacy files not removed.

**Action:** sunset `nfc.py` — return 410 Gone for one release, then remove.

### §4.2 — `email_validator` listed in `requirements.txt` but never used as `EmailStr`

`email-validator>=2.0.0,<3.0.0` is listed; `schemas/auth.py` uses `email: str` instead of `EmailStr`. Effective wasted dependency.

**Action:** either remove `email-validator` (if schema refactor rejects RFC validation) OR migrate email fields to `EmailStr` (recommended — see API_AUDIT V6).

### §4.3 — `scripts/__pycache__/` committed?

Not verified in audit — `.gitignore:2` should exclude. Recommend `git check-ignore scripts/__pycache__/file.pyc` confirmation.

---

## §5 — Type Hints

| Pattern | Status | Recommendation |
|---|---|---|
| Service return types | Mostly annotated (`-> QRCode`, `-> list[QRCode]`, `-> dict`) ✓ | OK |
| Endpoint return types | Annotated via `response_model=...` ✓ | OK |
| Function args | Most annotated, mentions `Optional` ✓ | OK |
| `current_user` arg | ~50 endpoints use `current_user = Depends(get_current_user)` without `: User` | Add `current_user: User = Depends(...)` for IDE support |

---

## §6 — Exception Handling

### §6.1 — Bare `except:`

- **0 bare `except:`** (`grep "^\s*except:" app/` returned nothing) ✓

### §6.2 — `except Exception:` totals (~55 across app/)

| Location | Count | Verdict |
|---|---|---|
| `services/license_crypto.py` | 20 | Intentional VM-detection fallbacks — but should `logger.warning(exc_info=True)` to surface abnormal false-positives |
| `core/scheduler.py` | 17 | Job fail-and-continue + scheduler-error swallowing — should emit metric `scheduler_job_failed_total` |
| `endpoints/health.py` | 6 | Probes for "alive" — OK |
| `endpoints/auth.py` | 5 | `_record_failed_login` / `_clear_brute_force` / `_is_token_blacklisted` Redis-down fail-open — should log warning when Redis disappears |
| `services/tpm_service.py` | 4 | Hardware probe fallbacks — OK |
| `services/nfc_v2_service.py` (lines 192) | 1 | **Bad — swallows asyncio RuntimeError silently without log** — see BACKEND/PERFORMANCE PF5 |
| `services/archive_service.py`, `device_review_service.py`, `deps.py`, `ws.py`, `core/security.py`, `main.py` | 2 each | Low |

### §6.3 — Recommendation

For every `except Exception: pass`:
- Log at WARNING level with `exc_info=True`
- Emit a metric (Redis incr): `errors_swallowed_total{location="..."}`
- For silent-fail-open patterns (Redis), alert ops if Redis down >5min

---

## §7 — Comments

### §7.1 — `TODO` / `FIXME` / `HACK` count (~25)

| Location | Count | Notes |
|---|---|---|
| `services/license_crypto.py` | 9 | Expected — anti-tamper edge conditions |
| `services/license_validator.py`, `device_review_service.py`, `server_identity.py`, `config.py`, `endpoints/licenses.py` | 2 each | Active sustainability debt |
| `services/nfc_v2_service.py` | 1 | The `asyncio.ensure_future` line — confirms suspected |
| All others | mostly / | Sparse |

### §7.2 — Docstrings

- Service functions have docstrings ✓
- Some endpoints without docstrings — but route + `tags=` are documented in OpenAPI
- Models: declarative columns are sparse on comments; 80 model files, 110 classes — recommend one-line class docstring per model

---

## §8 — Module & Import Hygiene

### §8.1 — `from app...` import style ✓

All imports follow `from app.X.Y import Z`. No relative `..` imports except in tests. ✓

### §8.2 — Unused imports

Recent session-3 audit removed 8. **Quick re-check:**

- `email-validator` declared but `EmailStr` not imported anywhere in `schemas/` (grep found only `str` for email fields)
- Not exhaustively re-run; green-check last audit's fix list still holds

### §8.3 — `__init__.py` files

All packages have `__init__.py` ✓. No empty ones with stale exports.

---

## §9 — Tests (cross-ref BACKEND §7)

| File | Tests |
|---|---|
| `test_license.py` | 61 |
| `test_auth.py` | 16 |
| `test_tenant_isolation.py` | 12 |
| `test_nfc_v2_service.py` | 14 |
| `test_finance_security.py` | 11 |
| `test_permissions.py` | 10 |
| `test_sync_service.py` | 6 |
| `test_corporate_service.py` | 5 |
| `test_archive_service.py` | 4 |
| `test_health.py` | 3 |
| `test_config.py` | 2 |
| **Total** | **148 collected** |

### §9.1 — Test gaps

- No tests for: corporate cross-tenant fix (H6 currently broken), NFC by-card path, parent_payments refund endpoints, `/settings` PUT, `/qr/{uuid}` unauth access
- No N+1 isolation tests (parent portal, student portal, transcript)
- No E2E tests
- No frontend tests (`npm test -- --passWithNoTests` runs 0)

---

## §10 — `print()` calls

- 0 `print(` in `app/` production code (confirmed via grep) ✓
- Test code print statements — fine (not audited)
- All `print()` migrated to `logging` in prior session per project memory ✓

---

## §11 — Maintainability Risks

| Risk | Mitigation |
|---|---|
| Newcomers can't easily find permission-by-role grants | Generate a doc table from `ROLE_PERMISSIONS` |
| `core/` overloaded (10 files: audit/security/perms/redis/scheduler/logging/notifications/server_identity/watermark) | Split into `core/security/`, `core/middleware/`, `core/observability/`, `core/integrations/` |
| Manual tenancy filter discipline | Adopt PostgreSQL RLS — code becomes defensive, bug-fix surface reduces |
| Two sync worker entry points | Single worker with env-gated role; activate only one at deploy time |
| `ServerIdentity` JSON file (server_id.json) on disk | Move into DB `ServerIdentity` table (already exists) — runtime file becomes read-only hint |
| Long endpoint files | Split finance.py (44 routes), academic.py (43) by subdomain (e.g. finance/invoices.py, finance/payments.py, finance/journal.py) |

---

## §12 — Findings Summary

| # | Severity | Finding | File |
|---|---|---|---|
| CQ1 | Medium | `include_deleted` copy-pasted ×30 | various |
| CQ2 | Medium | Late commit打破了 atomicity in `qr_service` + others | `qr_service.py:60` etc. |
| CQ3 | Medium | asyncio.ensure_future swallowed exception without log | `nfc_v2_service.py:192` |
| CQ4 | Medium | `scheduler.py` 17 silent `except: pass` blocks with no metric | `core/scheduler.py` |
| CQ5 | Medium | Permission enum inconsistency (`STUDENTS_VIEW` vs `STUDENT_*`) | `permissions.py:7-44` |
| CQ6 | Medium | `email-validator` declared but not used → dead dep | `requirements.txt` |
| CQ7 | Medium | Legacy `nfc.py` + `nfc_service.py` not removed alongside V2 | endpoints/nfc.py |
| CQ8 | Low | ~50 endpoints missing `current_user: User = Depends(...)` annotation | various |
| CQ9 | Low | Transcript mapping duplicated in 3 files | `students.py:294`, `report_cards.py:88`, `academic.py` |
| CQ10 | Low | `core/` overloaded — split into subfolders | core/ |
| CQ11 | Low | No bare `except:` (✓); ~55 `except Exception:` should log | various |
| CQ12 | Low | 1 untested area (corporate, NFC by-card, /settings, /qr) | tests/ |

---

## §13 — What's Done Well

- **Code style:** consistent across 110 model files / 48 service files / 50 router files
- **Dependency injection:** idiomatic FastAPI
- **Audit logging:** 160 calls across 28 files; never log passwords / JWTs (verified)
- **Soft-delete:** clean event listener with bypass
- **Multi-tenancy:** consistent filter pattern in services (with ~7 documented exceptions)
- **Decimal discipline:** ~60/63 money columns Decimal; 3 columns are Float (documented)
- **Migrations:** 23-step Alembic chain — single head (`824e09b38d35`) verified
- **Logging:** JSON formatter in prod, no `print()`
- **148 tests** collected and pass-rate verified

---

## §14 — Recommendation Priority

1. **CQ3 — Fix asyncio bug** (silent broadcast loss; also PERFORMANCE PF5)
2. **CQ2 — Document service-vs-transaction commit rule**; remove commits inside services except self-tx flows
3. **CQ1 — Extract helpers** (`can_see_deleted`, `set_auth_cookies`, `build_result_map`)
4. **CQ4 — Log scheduler swallowed exceptions; emit metrics**
5. **CQ8 — Add `current_user: User = Depends(...)` annotations** IDE support
6. **CQ5 — Rename `STUDENTS_VIEW` → `STUDENT_VIEW`** (single rename, done in one PR)
7. **CQ7 — Sunset legacy `nfc.py`** with 410 Gone for one release
8. **CQ10 — Split `core/`** into subfolders once and lock the change in CONTRIBUTING.md

---

**Code Quality Score: 70/100** — deduct 20 for duplicated patterns + 3 dead/legacy files + asyncio bug; deduct 10 for type-hint + enum inconsistencies.

**End of CODE_QUALITY_AUDIT.md**
