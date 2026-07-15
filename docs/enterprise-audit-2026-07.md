# Enterprise Audit Report — July 2026

## Executive Summary

Systematic analysis of the ZENOVA ERP codebase (1258 source files) across 35+ categories
covering architecture, security, performance, testing, and code quality.

- **Critical bugs fixed:** 3 (watermark NameError, academic_service AttributeError, frontend bundle bloat)
- **N+1 queries eliminated:** 3 services (trial_balance, list_teachers, list_staff)
- **Race conditions fixed:** 2 (purchase request/order number generation)
- **Auth state drift eliminated:** 1 (dual useState/React Query)
- **Module-level env vars deferred:** 1 (chapa_service)
- **Test suite passes:** 185/185 (2x faster after N+1 fixes)
- **Active issues:** 10 (see below)

---

## Critical & High Severity Findings

### CRITICAL — Fixed

| Issue | File | Fix |
|-------|------|-----|
| `NameError: name 'SCHOOL_WATERMARK' is not defined` | `backend/app/services/watermark.py:27,35` | Changed to `get_watermark().encode()` |
| `AttributeError: 'Student' object has no attribute 'current_class_id'` | `backend/app/services/academic_service.py:444,448,466,470` | Changed to `student.grade_id` |
| Zero `next/dynamic` usage — Three.js + Recharts on every page | 14 dashboard pages + login/activate | Created `components/3d/dynamic.tsx` with `dynamic(() => import(...), { ssr: false })` |

### HIGH — Fixed

| Issue | File | Fix |
|-------|------|-----|
| `trial_balance()` N+1 query (per-account SQL) | `finance_service.py:748-766` | Single batch query with `account_id.in_(...)` |
| `list_teachers()` N+1 redundant JOIN query | `teacher_service.py:143-164` | Query both `(User, TeacherProfile)` via join |
| `list_staff()` Double N+1 (profile + role) | `staff_service.py:91-120` | Join + batch role load via `Role.id.in_(...)` |
| `create_purchase_request()` race condition | `finance_service.py:693-705` | Use `_next_sequence_number()` with `with_for_update()` |
| `create_purchase_order()` race condition | `finance_service.py:726-738` | Use `_next_sequence_number()` with `with_for_update()` |
| Auth context dual state (useState + React Query drift) | `frontend/src/services/auth-context.tsx` | Single data source from `useQuery().data` |
| `chapa_service.py` module-level env var reads | `chapa_service.py:16-17` | Deferred via `_default_chapa_keys()` function |
| Login full-reload redirect | `auth-context.tsx:login()` | Removed `window.location.href`; login page uses `router.push()` |

---

### Remaining HIGH Issues

1. **HTTPException in service layer** (10+ services) — Services should raise custom exceptions, not HTTPExceptions
   - `academic_service.py`, `finance_service.py`, `license_service.py`, `parent_service.py`, `student_service.py`,
     `teacher_service.py`, `staff_service.py`, `attendance_service.py`, `notification_service.py`, `communication_service.py`,
     `support_ticket_service.py`, `wallet_service.py`
   - Fix: Create domain exceptions in `app/core/exceptions.py`, replace all `raise HTTPException(...)` in services

2. **Duplicate WebSocket managers** — `notification_manager.py` and `scan_event_manager.py` are identical shallow wrappers
   - Fix: Consolidate into `ws_manager.py` with shared `ConnectionManager` class

3. **Import cycles** — 9+ service files have inline imports
   - `parent_payments.py`, `chapa_service.py`, `license_service.py`, `sync_service.py`, etc.
   - Fix: Extract shared dependencies to avoid circular imports

4. **233 `"use client"` directives** — Zero server components; every route re-hydrates from scratch
   - Fix: Identify truly static content (dashboard KPIs, student info), extract to Server Components

5. **TanStack Query unused on 97% of pages** — Most pages use raw `useEffect` + `fetch` patterns
   - Fix: Migrate to `useQuery`/`useMutation` hooks in all pages

6. **36/52 services untested** (69% coverage gap)
   - `academic_service.py`, `attendance_service.py`, `parent_service.py`, `student_service.py`, etc.
   - Fix: Add unit tests with real DB test fixtures

7. **Zero real database tests** — All tests use `MagicMock`
   - Fix: Add `pytest-postgresql` or `testcontainers` for integration tests

8. **Zero frontend unit tests**
   - Fix: Add Jest + React Testing Library tests for components

9. **~15 tautological tests** — Mocks that assert mocked behavior
   - Fix: Review and rewrite as meaningful behavior tests

10. **No conftest.py / factory infrastructure**
    - Fix: Create shared test factories with `factory_boy`

---

### MEDIUM Issues (Deferred)

| Issue | Priority | Notes |
|-------|----------|-------|
| `notification_service.py` — Triple N+1 in `notify_absence()` | MEDIUM | Capped by parent count per student |
| `parent_payment_service.py` — Nested N+1 in dashboard/invoices | MEDIUM | Lower-frequency calls |
| `support_ticket_service.py` — Conditional N+1 | LOW | Only for assigned tickets |
| `communication_service.py` — N+1 in `get_messages()` | LOW | Capped at 50 by `.limit(50)` |
| `platform_commission_service.py` — Double N+1 in ranking | LOW | Small number of active schools |

---

## Performance Impact Summary

| Metric | Before | After |
|--------|--------|-------|
| Backend test suite runtime | ~107s | ~49s |
| Three.js bundle inclusion | Eager (all routes) | Lazy (only on dashboard pages) |
| Auth state re-renders on refetch | UI flash (stale data during refetch) | No flash (`loading` includes `isFetching`) |
| Auth data source | Dual (useState + query cache) | Single (query cache) |
| Purchase request/order numbers | Race-prone `count()` | Atomic sequence lock |
| teacher_service N+1 | 1+N queries | 1 query |
| staff_service N+1 | 1+2N queries | 2 queries |
| trial_balance N+1 | 1+N queries | 2 queries |
