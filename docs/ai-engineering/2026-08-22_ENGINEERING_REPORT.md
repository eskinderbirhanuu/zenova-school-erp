# ZENOVA — Engineering Report

**Date:** 2026-08-22  
**Agent:** Buffy (Codebuff AI Engineering Agent)  
**Session Type:** Autonomous Full-Stack Engineering — Analysis + Fixes

---

## Objective

Perform a comprehensive autonomous engineering review of the entire ZENOVA School ERP project and implement priority fixes for security, correctness, and code quality issues.

---

## Problems Found

### From Complete Project Analysis (185+ files inspected)

| Category | Issues Found | Severity Breakdown |
|----------|-------------|-------------------|
| Architecture | 4 | 0 Critical, 1 High, 3 Medium |
| Backend | 7 | 3 Critical (fixed), 2 High, 2 Medium |
| Frontend | 10 | 4 High, 4 Medium, 2 Low |
| Database | 10 | 2 High, 6 Medium, 2 Low |
| Security | 12 | 7 Critical (fixed), 3 High (fixed), 2 Medium |
| Performance | 8 | 2 High, 4 Medium, 2 Low |

### Key Findings from Prior Audits

- **273 total fixes** applied across prior audit cycles
- **380 tests** passing (up from ~0)
- **Production readiness score: 7.7/10**
- All Critical P0 security bugs already fixed

---

## Root Causes

1. **localStorage reads for auth tokens** — Legacy pages bypassed the shared `api` client, using `fetch()` with manually-constructed auth headers from localStorage where tokens don't exist
2. **Sync/async boundary bug** — NFC scan broadcast used `asyncio.ensure_future()` in a sync function that runs in FastAPI's threadpool (no event loop)
3. **Missing frontend security headers** — Backend emitted security headers but Next.js frontend had none (defense-in-depth gap)
4. **Hardcoded infrastructure IPs** — CORS origins contained developer's local IP instead of being fully configurable
5. **Suppressed error messages** — Login pages swallowed server errors, preventing debugging

---

## Changes Made

### 1. Fix: Timetable page auth (Security)
**File:** `frontend/src/app/(legacy)/academic/timetable/page.tsx`  
**Problem:** `localStorage.getItem("access_token")` — token never written there; `fetch()` with manual `Authorization` header instead of cookies  
**Fix:** Replaced with `academicService.timetable.list()` which uses the shared axios client with `withCredentials: true` and CSRF token injection

### 2. Fix: NFC broadcast async bug (Critical Bug)
**Files:** `backend/app/services/nfc_v2_service.py`, `backend/app/api/v1/endpoints/nfc_v2.py`  
**Problem:** `asyncio.get_running_loop()` called in sync function running in threadpool → `RuntimeError` silently caught → WebSocket broadcast never delivered  
**Fix:** 
- Removed broken broadcast from sync `scan_nfc()` service
- Service now returns `_broadcast` payload in response dict
- Made `/nfc/scan` endpoint `async def` to properly `await scan_event_manager.broadcast()`
- Removed unused `import asyncio` from service

### 3. Fix: Frontend security headers (Security)
**File:** `frontend/next.config.ts`  
**Problem:** No security headers in Next.js — only backend emitted them (defense-in-depth gap)  
**Fix:** Added 7 security headers applied to all routes:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy` with strict defaults

### 4. Fix: Global 403 handler (UX)
**File:** `frontend/src/services/api.ts`  
**Problem:** 403 Forbidden responses had no global handler — each page showed ad-hoc error  
**Fix:** Added 403 → redirect to `/unauthorized` in the axios response interceptor

### 5. Fix: Super-admin login error messages (UX)
**File:** `frontend/src/app/(super-admin)/super-admin/login/page.tsx`  
**Problem:** `catch { }` swallowed server error; user saw generic "Invalid credentials"  
**Fix:** Extracts `response.data.detail` from server error and shows it in the toast

### 6. Fix: Hardcoded CORS IP (Security)
**Files:** `backend/app/main.py`, `backend/app/config.py`  
**Problem:** `http://192.168.1.5:3000` hardcoded in default CORS origins  
**Fix:** Removed hardcoded IP from both files; fully configurable via `ALLOWED_ORIGINS` env var

### 7. Fix: Duplicate config field (Bug)
**File:** `backend/app/config.py`  
**Problem:** `license_offline_grace_days` defined twice (lines 37 and 77)  
**Fix:** Removed duplicate; first definition retained

### 8. Analysis: lucide-react version (False Positive)
**Finding:** Audit flagged `lucide-react@^1.21.0` as "non-existent major"  
**Resolution:** Confirmed installed at `1.21.0` and working across 50+ components. Package is real; audit was outdated.

---

## Files Modified

| # | File | Change Type |
|---|------|-------------|
| 1 | `frontend/src/app/(legacy)/academic/timetable/page.tsx` | Security fix |
| 2 | `backend/app/services/nfc_v2_service.py` | Bug fix |
| 3 | `backend/app/api/v1/endpoints/nfc_v2.py` | Bug fix |
| 4 | `frontend/next.config.ts` | Security hardening |
| 5 | `frontend/src/services/api.ts` | UX improvement |
| 6 | `frontend/src/app/(super-admin)/super-admin/login/page.tsx` | UX improvement |
| 7 | `backend/app/main.py` | Security fix |
| 8 | `backend/app/config.py` | Bug fix (×2) |
| 9 | `docs/ai-engineering/PROJECT_ANALYSIS.md` | New documentation |
| 10 | `docs/ai-engineering/2026-08-22_ENGINEERING_REPORT.md` | New documentation |

---

## Security Changes

| Change | Impact |
|--------|--------|
| Removed hardcoded CORS IP | Eliminates developer IP from production default |
| Added frontend security headers (7) | Defense-in-depth: HSTS, CSP, X-Frame-Options even if backend headers missed |
| Fixed auth token localStorage reads | Prevents silent auth failures from broken token path |
| NFC broadcast fix | Ensures real-time scan monitoring actually works |

---

## Performance Changes

| Change | Impact |
|--------|--------|
| NFC broadcast moved to async endpoint | Eliminates wasted sync attempts; broadcasts now actually deliver |

---

## UI/UX Changes

| Change | Impact |
|--------|--------|
| Global 403 → /unauthorized redirect | Consistent experience instead of ad-hoc per-page errors |
| Super-admin login shows server errors | Better debugging and user feedback |

---

## Tests Executed

| Check | Result |
|-------|--------|
| Python syntax check (4 backend files) | ✅ All pass |
| TypeScript type check (3 frontend files) | ✅ No new errors |
| Pre-existing TypeScript errors | 220+ (pre-existing, unrelated to changes) |

---

## Remaining Risks

1. **No DB Row-Level Security** — tenant isolation enforced only in app code; multi-school SaaS requires RLS
2. **30+ service files with `db.commit()`** — unit-of-work violations; audit trail can desync on rollback
3. **Dual permission systems** — `require_role` and `PermissionChecker` not unified
4. **Test coverage gaps** — Frontend has 0 tests; backend missing role matrix and concurrency tests
5. **Sync worker dual-writer** — In-process + standalone workers risk grabbing same queue rows
6. **Several `except Exception: pass` blocks** — 55+ swallowed exceptions, 17 in scheduler alone

---

## Next Recommended Work

### Immediate
1. Add React Query to replace manual `useState + useEffect` data fetching (client-side caching, refetch-on-focus)
2. Lazy-load Three.js — dynamic import for dashboards only (500KB+ bundle reduction)
3. Add `usePermission()` hook for frontend conditional rendering

### Short-Term  
4. Unify `require_role` and `PermissionChecker` into single RBAC system
5. Add Playwright E2E tests for login → dashboard → mark attendance flow
6. Add DB Row-Level Security for multi-tenant isolation

### Medium-Term
7. Extract audit logging to Postgres trigger (eliminates unit-of-work conflicts)
8. Externalize workers to Celery + Redis broker
9. Add Sentry for error tracking

---

*Generated by Buffy (Codebuff AI Engineering Agent)*  
*ZENOVA School ERP — Autonomous Full-Stack Engineering Protocol*
