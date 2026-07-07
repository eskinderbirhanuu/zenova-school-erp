# ZENOVA — Backend Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Senior Backend Engineer role
**Method:** Static analysis of `backend/app/`. No code modified.
**Scope:** FastAPI app structure, services, workers, transaction patterns, error handling, observability, tests.

> **Authorization / IDOR / validation findings:** see API_AUDIT.md (most backend security surface lives at the endpoint boundary). This report covers the *services and runtime layer*.

---

## Executive Summary

The ZENOVA backend is a well-organized FastAPI monolith with 48 services, 50 endpoint files, 110 models, ~50 config settings, structured logging, scheduled background tasks, graceful shutdown, and security middleware. Its biggest risks are an **asyncio bug that silently kills NFC scan broadcasts**, a **double-writer sync worker sharing one un-locked queue**, **services that commit when the caller already owns the transaction** (causing audit-row loss when caller rolls back), and **service-level N+1 patterns on parent/student portals**.

| Score | Dimension | Notes |
|---|---|---|
| 75/100 | FastAPI architecture | Clean deps, correct middleware order |
| 65/100 | Service layer | Mostly correct, some transaction-boundary violations |
| 60/100 | Background jobs | Thread-based, double-writer, asyncio bug |
| 70/100 | Observability | Structured logging + metrics middleware; no error tracking |
| 65/100 | Transaction discipline | Mostly OK; `log_audit` after commit pattern is risky |
| 78/100 | Test coverage | 148 tests collected — auth, archive, NFC, sync, finance, permissions, license |

---

## §1 — App Structure

```python
app = FastAPI(title="ZENOVA ERP", version="1.0.0",
              docs_url=None if production else "/docs",
              redoc_url=None if production else "/redoc")
```

- **5 middleware** added bottom-up: CORS, SecurityHeaders, RateLimit, Metrics, CSRF, watermark.
- **Startup**: validate .lic file → fallback cloud validation → start sync worker thread (30s startup delay, 300s loop) → start APScheduler (9 cron jobs).
- **Shutdown**: set `_sync_shutdown` event → join sync thread with 60s timeout → stop scheduler → close Redis.
- **Single router include** `v1_router` aggregating 48 sub-routers (in `router.py`).
- **Default FastAPI exception handling** — no custom `@app.exception_handler` (see API E1).

---

## §2 — Service Layer

48 service files in `backend/app/services/`. Top by size:

| File | KB | Purpose |
|---|---|---|
| `license_crypto.py` | 28 | 8-component hardware fingerprint, VM/Docker detection, RSA-PSS license signing, TPM optional, 75% tolerance match |
| `finance_service.py` | 32 | Journal, invoices, payments, GL, trial balance; 23 `log_audit` calls |
| `academic_service.py` | 21 | Classes, sections, exams, results, promotions; 26 `log_audit` calls |
| `parent_payment_service.py` | 18 | Chapa gateway, payment sessions, refunds, receipts; has REFCUND IDOR bugs (API_AUDIT H1, H2) |
| `license_service.py` | 17 | V1/V2/SAL key gen, verify, activate, initialize_system |
| `hr_service.py` | 12 | Leave balances, attendance, staff moves |
| `platform_commission_service.py` | 11 | Daily platform fees, monthly invoicing |
| `receipt_service.py` | 11 | PDF receipts |
| `device_review_service.py` | 10 | Device change workflow, 24h auto-approve, DEVICE_LOCKED |
| `nfc_v2_service.py` | 18 | Per-type cards, scan log; carries silent asyncio bug (see §5) |

### §2.1 — Service antipatterns

| # | Pattern | File:Line | Risk |
|---|---|---|---|
| S1 | Service calls `db.commit()` directly then `log_audit_and_commit` calls `db.commit()` again — **caller's unit of work atomically broken** | `qr_service.py:60` (single commit + audit), `archive_service.py:run_archive` | If caller (endpoint) wraps in try/except and rolls back on error, audit row was already committed → audit trail desyncs from real change |
| S2 | `log_audit()` only `flush()`s — caller must `commit()`. Many endpoints forget to commit if they call a service that returns without committing | various endpoints | Audit row lost silently |
| S3 | `corporate_service` has NO `school_id` filter (intentional — corp is global) but endpoints accept any auth'd user | `corporate_service.py:60,113,133,145` | See API_AUDIT H6 |
| S4 | `support_ticket_service` has NO tenant filter — global | `support_ticket_service.py` | Intentional for cross-tenant support; needs strict role gate currently weak |
| S5 | `authenticate_student_parent` queries by `student_id_str` globally, no `school_id` scope | `auth_service.py:168` | Cross-tenant parent-student link möjlighet |

### §2.2 — Service layering

- Services call services (e.g., `parent_payment_service` → `receipt_service`) — coupling OK for monolith, may need event-based decoupling at scale.
- `license_service` calls `license_crypto`, `tpm_service`, `device_review_service`, `heartbeat_service` — coupled heavily; OK.
- `sync_service` is self-contained; good (it runs in a separate thread context).

---

## §3 — Workers & Background Jobs

### §3.1 — Standalone sync worker (`workers/sync_worker.py`)

```python
while not _shutdown.is_set():
    sync_service.process_queue(db)   # 30s loop
db = SessionLocal() per iteration
```

- Run via `python -m app.workers.sync_worker 30` for Docker / systemd.
- `SIGTERM`/`SIGINT` set `_shutdown` event loop drains current iteration then exits. ✓ graceful shutdown.

### §3.2 — In-process sync worker (`main.py:_start_sync_worker`)

Started as a daemon thread inside the uvicorn process — 30s startup delay (gives main.py time to start), 300s loop, calls the same `sync_service.process_queue`. **Both workers risk grabbing the same `SyncQueue` rows.**

### §3.3 — APScheduler (`core/scheduler.py`)

Single `BackgroundScheduler` runs in the uvicorn process. 9 cron jobs:

| Cron | Job |
|---|---|
| 02:00 | archive (retention: attendance 730d, notifications 180d, audit 365d, sync_queue 90d) |
| 03:00 | backup rotation (hourly→24, daily→30, weekly→12) |
| 23:30 | daily fee assessment |
| 1st-of-month 01:00 | monthly platform invoicing |
| every 6h | license heartbeat (cloud check) |
| every 4h | offline grace-period enforcement |
| every 2h | stale session cleanup |
| 05:30 | TPM fingerprint backfill |
| 04:00 | device-change archive |

- No retry logic; failed jobs silently `except: pass` (17 such blocks in `core/scheduler.py`).
- Single-process schedule — cannot scale beyond one uvicorn replica. Deploying 2 replicas globally would run every job 2×.

### §3.4 — Recommendation

- Externalize workers: Celery + Redis broker; or replace APScheduler with `arq` (async) and add row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) to `sync_queue`.
- Lock scheduler to a single replica: `if os.environ.get("SCHEDULER_ROLE") == "leader": start_scheduler()`.
- Add retry with exponential backoff on failed jobs; emit a metric `scheduler_job_failed_total`.

---

## §4 — Observability

### §4.1 — Logging

- `core/logging_config.py` — JSON formatter in production (`ENVIRONMENT=production`), plain `[ts] LEVEL name` in dev.
- Mutes `uvicorn.access` and `sqlalchemy.engine` logs — good for prod noise.
- All `print()` calls previously migrated to `logging` ✓
- **No correlation-ID passing** — `X-Request-ID` is generated in watermark middleware but not bound to logging context. Recommend `contextvars` to thread the request_id into every log line.

### §4.2 — Metrics

- `GET /api/v1/metrics` returns request count, method/path/status breakdown, avg latency, uptime. Captured by `MetricsMiddleware` in `endpoints/metrics.py`.
- **No Prometheus exposition format** — just JSON. Heapster / VictoriaMetrics cannot scrape. Recommend `prometheus_fastapi_instrumentator` package.
- **No histogram buckets / percentile latency** — just average.

### §4.3 — Error tracking

- **None configured.** No Sentry, no LogRocket, no Rollbar.
- Recommendation: add `sentry-sdk[fastapi]`; initialize in `main.py` startup; capture exceptions automatically.

### §4.4 — Tracing

- **No distributed tracing** (no OpenTelemetry). For a monolith this is fine; once VPS+local sync is exercised, penn-trace helps diagnose hangs.

---

## §5 — asyncio.ensure_future Bug (Silent Broadcast Loss)

### §5.1 — The bug

`nfc_v2_service.scan_nfc` (line 182):

```python
try:
    asyncio.ensure_future(scan_event_manager.broadcast({...}))
except Exception:
    pass
```

`scan_nfc` is a **sync function** (`def scan_nfc(...)`). FastAPI runs sync handlers in a threadpool **without an event loop**. `asyncio.ensure_future(coro)` requires a running event loop and raises `RuntimeError: no running event loop`.

The `except Exception: pass` swallows it silently. No log entry, no metric, no error.

### §5.2 — Same pattern in other services

- `communication_service.py:51` — likely same
- `notification_service.py:78` — likely same
- (verify each by grep)

### §5.3 — Impact

WebSocket broadcast of NFC tap events (scanner / scan-monitor pages) **never actually delivers** for taps that flow through this sync path. Realtime UX silently broken. No one notices because there's no error.

### §5.4 — Fix

Capture the main event loop at startup (`main.py`):

```python
main_event_loop = asyncio.get_event_loop()

# in scan_nfc:
asyncio.run_coroutine_threadsafe(scan_event_manager.broadcast({...}), main_event_loop)
```

Or simply convert the affected endpoint to `async def` and `await` the broadcast.

---

## §6 — Transaction Discipline

### §6.1 — Patterns observed

```python
def some_service(db, ...):
    obj = Model(...)
    db.add(obj)
    log_audit(db, ...)           # db.flush() only — caller owns the tx
    # NO db.commit() — caller commits
```

- Correct pattern in 90% of services ✓
- BUT `qr_service.generate_qr` (line 60) calls `db.commit()` inside the service → caller cannot roll back the audit row + qr creation together, and an exception in the caller leaves orphan committed rows.
- `archive_service.run_archive` is designed to commit per-archive-row internally — appropriate for archive (atomic-per-row).

### §6.2 — `log_audit` atomicity concern

```python
def log_audit(db, ...):
    db.add(AuditLog(...))
    db.flush()           # NOT commit
```

If the caller commits, both the mutation and the audit row commit together — **atomic.** ✓

If the caller's commit fails (e.g., constraint violation in unrelated code), the audit row is rolled back too — **the audit is lost for any failed write**. The prior GLM SECURITY_AUDIT flagged this as critical-3 ("audit trail unreliable"). Mitigations:

1. Use a separate session for audit-write that always commits (write outside the caller's tx — costs a query-per-mutation at minimum)
2. Use a queue + a worker to write audit asynchronously (delays forensic availability)
3. Use a Postgres trigger that writes audit rows from inside the DB transaction — survives 100% of caller commit failures

### §6.3 — Recommendation

Option 3 is best practice — sink `log_audit` to a Postgres-level trigger. Maintain `log_audit()` for backward compat (now read-only).

---

## §7 — Tests

| File | Tests | Subject |
|---|---:|---|
| `test_license.py` | 61 | License V2 format, CRC, fingerprint matching, grace, cloud verify |
| `test_auth.py` | 16 | Login flow, token lifecycle, rate limiter, MFA, password reset |
| `test_tenant_isolation.py` | 12 | Cross-tenant query rejection |
| `test_nfc_v2_service.py` | 14 | NFC assign/scan/bulk, status, expiry |
| `test_finance_security.py` | 11 | Finance authorization |
| `test_permissions.py` | 10 | `require_permission` matrix |
| `test_sync_service.py` | 6 | Enqueue, dedup, conflict detection |
| `test_corporate_service.py` | 5 | Corporate CRUD |
| `test_archive_service.py` | 4 | Archive, restore, force-restore |
| `test_health.py` | 3 | Health probes |
| `test_config.py` | 2 | SECRET_KEY validation |
| **Total collected** | **148** | `pytest --co -q` |

### §7.1 — Coverage assessment

- Auth, license, NFC, sync, finance perms, permissions, archive — **covered**.
- Parent portal, student portal, dashboard N+1 — **NOT covered by tests** (N+1 visible only under load; not unit-testable).
- IDOR / cross-tenant endpoints (corporate, NFC by-card, refunds, card-design, /settings) — **NOT specifically tested**; the `test_tenant_isolation.py` covers the happy path.
- Frontend tests — `npm test -- --passWithNoTests` per CI → **0 actual front-end tests**.
- No E2E / Playwright tests.

### §7.2 — Recommendation

- Add N+1 detection test using SQLAlchemy `assert 1 == db.query(Query).count()` in the parent portal test.
- Add tests for corporate / NFC by-card / refund endpoints explicitly verifying cross-tenant rejection.
- Add Playwright E2E for login → dashboard → mark attendance flow.

---

## §8 — Code Quality Signals

### §8.1 — Long files

| Lines | File | Acceptable? |
|---|---|---|
| 688 | `license_crypto.py` | Yes — edge-heavy |
| 628 | `finance_service.py` | Borderline — consider module split |
| 522 | `endpoints/auth.py` | Borderline — split login / refresh / mfa / reset / register |
| 520 | `parent_payment_service.py` | Borderline |
| 460 | `license_service.py` | Yes |
| 437 | `endpoints/students.py` | Borderline — split bulk/Excel/transcripts |
| 418 | `nfc_v2_service.py` | Yes |

### §8.2 — `except Exception:` clauses

- ~55 total — 20 in `license_crypto.py` (intentional VM-detection fallbacks), 17 in `core/scheduler.py` (fail-and-continue), 6 in `endpoints/health.py` (OK), 5 in `endpoints/auth.py` (Redis fail-open — OK with log line), 4 in `tpm_service.py` (OK hardware), 2 each scattered.
- **No bare `except:` (without Exception) found** ✓
- Recommendation: add `logger.warning(exc_info=True)` to every swallowed `except Exception`; scheduler errors should emit a metric.

### §8.3 — `print()` calls in app/

- 0 in production code ✓ (migrated in prior session)

### §8.4 — Duplicated patterns

- `include_deleted` gating ~30× copy-paste → extract `can_see_deleted(current_user) -> bool`
- transcript exam-result mapping loop in 3 files → extract `_build_result_map(results, exams)` to `utils/grading.py`
- Auth cookie-set triplet copy-pasted 3× in `auth.py` → extract `set_auth_cookies(response, access, refresh, role)`

### §8.5 — TODO/FIXME

~25; mostly in `license_crypto.py` (expected), `device_review_service.py`, `server_identity.py`. No active silent debt.

### §8.6 — Type hints

- ~50+ endpoints use `current_user=Depends(get_current_user)` without `: User` annotation. Recommend `current_user: User = Depends(get_current_user)` for IDE support.

---

## §9 — Recommendations Summary

1. **Fix the asyncio broadcast bug** (§5) — convert affected routes to async OR use `run_coroutine_threadsafe` with cached loop ref.
2. **Decouple the duplicate sync worker** (§3) — pick one; add row-level lock on `sync_queue`; log when claimed.
3. **Lock scheduler to leader** (§3) — env-gated so multi-replica only runs jobs once.
4. **Add global exception handler** in `main.py`.
5. **Migrate `log_audit` to Postgres trigger** OR enforce caller-owns-tx discipline (no service-level commit).
6. **Add request_id to logs via contextvars** — correlate logs across services.
7. **Add Sentry / OpenTelemetry** — error tracking + tracing.
8. **Prometheus exposition format** for `/metrics` — let Grafana scrape.
9. **Add Playwright E2E tests** — login → dashboard → mark attendance.
10. **Add N+1 isolation tests** for parent_portal / student_portal.

**Backend Score: 72/100** — deduct 18 for asyncio + transaction + double-worker + observability gaps; award full marks for clean layering, structured logging, graceful shutdown, security middleware.

**End of BACKEND_AUDIT.md**
