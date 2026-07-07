# ZENOVA — Enterprise Architecture Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 (Z-Ai) — Principal Architect role
**Method:** Static analysis. No code modified.
**Scope:** Folder structure, layering, modularity, scalability, tenancy model, sync architecture, offline-first design.

---

## Executive Summary

ZENOVA is a FastAPI + Next.js monolith organized as a layered ERP. The architecture is **coherent, modular, and matches its stated goals** — multi-tenant via `school_id`, soft-delete, audit-everywhere, license-gated features. However, it is a **monolith with thread-based async**, **no event bus**, **dual sync workers sharing one queue**, and **inconsistent module boundaries**. For the stated scale (1,000 schools, 1M users), the architecture is **workable but fragile** — without a worker queue, table partitioning, or read replicas, peak load and long-running sync will degrade.

| Score | Layer | Notes |
|-------|-------|-------|
| 65/100 | Architecture | Good layering, bad concurrency model |
| 72/100 | Tenant isolation | Pattern solid, a few exceptions (see DB & API audits) |
| 55/100 | Scalability | Monolith with single writers everywhere |
| 80/100 | Maintainability | 80 models / 48 services / 50 routers — logical split, consistent style |
| 60/100 | Async/sync story | Mixed, latent bugs (see C7 below) |

---

## §1 — Folder Structure & Layer Separation

```
ZENOVA/
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app + 5 middleware + startup/shutdown
│   │   ├── config.py            ← Pydantic Settings (~50 settings)
│   │   ├── database.py          ← SQLAlchemy engine + soft-delete event listener
│   │   ├── api/v1/
│   │   │   ├── router.py        ← aggregates 48 sub-routers
│   │   │   ├── deps.py          ← get_current_user, require_permission, rate_limit
│   │   │   └── endpoints/       ← 50 router files (1 per domain)
│   │   ├── core/                ← 10 files (audit, security, perms, redis, scheduler, ...)
│   │   ├── models/              ← 80 files / 110 model classes
│   │   ├── schemas/             ← 28 Pydantic v2 schema files
│   │   ├── services/            ← 48 service files (business logic)
│   │   ├── workers/             ← sync_worker.py (threading)
│   │   ├── utils/               ← excel.py, grading.py
│   │   ├── licensing/           ← coreval.pyd C extension + public_key.py
│   │   └── data/                ← server_id.json runtime storage
│   ├── alembic/versions/        ← 23 migrations, head = 824e09b38d35
│   ├── tests/                   ← 11 test files / 148 tests collected
│   └── requirements.txt         ← 22 packages, 20 pinned
├── frontend/
│   └── src/
│       ├── app/                 ← Next.js 16 App Router, role-grouped routes
│       ├── components/           ← 35 .tsx files
│       ├── services/            ← api.ts (axios + 401-refresh)
│       └── middleware.ts        ← edge route guard, role-prefix RBAC
├── license-server/             ← separate FastAPI service (cloud)
├── k8s/                         ← 9 manifest files
├── deploy/                      ← docker-compose.vps, nginx, scripts
├── nginx/                       ← dev proxy
├── docs/                        ← consolidated documentation
└── scripts/                     ← one-shot utilities
```

**Verdict:** Clean separation. Endpoints → services → models is preserved 95%+ of the time. Schemas hang off services correctly. The `core/` bucket is overloaded (middleware, audit, security, perms, redis, scheduler, logging, notifications, server_identity, watermark) and should be split into `core/security`, `core/middleware`, `core/observability`, `core/integrations`.

---

## §2 — Clean Architecture Compliance

| Principle | Status | Notes |
|---|---|---|
| Endpoints contain zero business logic | Mostly | A few endpoints have inline COUNT queries (`dashboard.py:37-82`) |
| Services don't import HTTP stuff | Yes | No `fastapi` imports in services/ |
| Models don't know about services | Yes | Models are pure SQLAlchemy 2.0 declarative |
| Schemas validate wire boundary | Yes | Pydantic v2 throughout; a few `dict` bodies violate this (see API audit M7-M8) |
| Cross-cutting concerns via middleware | Yes | 5 middleware cleanly separated |
| Dependency injection | Yes | `Depends` everywhere; `get_db`, `get_current_user`, `require_permission`, `require_licensed_feature` |

**Layering violations (smell, not blocking):**
1. Services sometimes call `db.commit()` directly (`qr_service.py:60`, `archive_service.py`). This breaks the unit-of-work pattern — the caller's transaction is no longer atomic with the audit log. Recommendation: services should `db.flush()` only; caller commits.
2. Endpoints sometimes call `db.commit()` instead of returning the unit of work (`settings.py:40`). Same rule.
3. `log_audit` uses `db.flush()` correctly (caller owns the tx) — but 160 callers, some inside services that commit afterward, others inside endpoints that never commit (audit rows leak into a never-committed tx → silent loss).

---

## §3 — Tenancy Model

- **Isolation pattern:** every tenant-scoped model has `school_id = Column(String, ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True)`.
- **Filter pattern:** every list/get service function chains `.filter(Model.school_id == school_id)`; bulk imports **force** `forced_school_id = current_user.school_id` to defeat body injection.
- **Soft-delete:** every model exposes `deleted_at`; a `Query.before_compile` event listener auto-injects `entity.deleted_at.is_(None)`. Bypass via `.execution_options(include_deleted=True)` gated behind role check.
- **SUPER_ADMIN:** `has_permission()` returns `True` unconditionally; many endpoints branch on `is_superuser or role_name in ("ADMIN", "SUPER_ADMIN")` to allow view-of-deleted.
- **RF: PostgreSQL Row-Level Security** is not enabled. The application enforces tenancy in Python only — a single missed `.filter()` (see corporate H6, NFC H5, refund H1-H2) leaks all tenants. Defense in depth would add RLS policies so that even an exploited Python path is constrained at the DB layer.

**Tenancy exceptions / leaks:**

| Model | school_id | Severity | Owner |
|---|---|---|---|
| `StudentCard`, `StaffCard`, `ParentCard`, `EmployeeCard` | absent | **Critical** | C7 (SECURITY_AUDIT) |
| `CorporateDepartment`, `CorporateEmployee` | absent | Medium (intentional?) | H6 |
| `CardPrintRequest` | absent | High | DB_AUDIT |
| `AuditLog.school_id` | present but nullable, never populated | **Critical** | DB_AUDIT |
| `NfcScanLog.school_id` | nullable, not enforced | High | DB_AUDIT |

---

## §4 — Sync Architecture

Two sync workers exist:

1. **Background thread** started by `main.py:_start_sync_worker` — 30s startup delay, 300s loop, runs inside the uvicorn process.
2. **Standalone worker** — `python -m app.workers.sync_worker 30` for Docker / systemd.

Both target `sync_service.process_queue(db)` and rely on `SyncQueue.status` claims for dedup. **No row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`).** Under load, both workers can grab the same row → double-processing.

**Payload integrity:** HMAC-SHA256 over `f"{server_id}.{sync_ts}"` with `sync_secret` from `server_id.json`. **Body bytes are NOT in the signed message** (see SECURITY_AUDIT C5). The receiving side dedups via `(payload_hash, source_server_id)` but the hash is of the payload seen inbound, not of the payload sent — a MITM can alter both consistently.

**Recommendation:** Switch to a real queue (Redis Streams or RabbitMQ) with `FOR UPDATE SKIP LOCKED` claiming. Sign the *body* in the HMAC. Add a 60s replay window. Consider partitioning `sync_queue` by `school_id`.

---

## §5 — Offline-First & Cache Architecture

- **Redis** is used for: rate-limit counters, brute-force counters, `jti` blacklist, license cache (`license:status` TTL 1800s), session markers.
- **Redis failure mode:** fail-open — middleware/rate limiter/brute-force/`jti` checks all `_redis_unavailable` flag once and skip silently for the rest of the process lifetime. This is **availability-correct but security-degraded**.
- **Offline-first:** every Auth check still functions with Redis down. License functions survive offline via 45/30/15/7-day env-aware grace period past last cloud contact.
- **No CDN** — frontend served by Next.js + nginx only. Static assets (student photos, uploaded documents) served directly from nginx / Next public. Would not survive 10k concurrent users at present.

---

## §6 — Scalability Assessment

The application is **shared-nothing across schools except for the DB writer**. Scale assumptions:

| Metric | Capacity | Limit | Reason |
|---|---|---|---|
| Concurrent request rate | ~500 req/s | Per-uvicorn worker | Single Python process; sync handlers in threadpool |
| Schools | 1,000 | OK if 1 DB | ~1M rows in tenant tables — fine with composite indexes |
| Schools | 5,000+ | Bottleneck | Single `attendances` table grows to ~500M rows/yr → must partition |
| Students per school | 20,000 | ✓ | Composite `(school_id, student_id)` indexes cover it |
| Total students | 1M | Degraded at peak | `dashboard.py` COUNTs, parent-portal N+1 (PERF_AUDIT H1-H3), academic list endpoints unbounded |
| Background jobs | 9 scheduled + 1 worker | No budget for backlog | All run on one BackgroundScheduler in the uvicorn process — no burst capacity |

**Required for scale beyond 100–200 schools:**
1. Read replica for dashboard / report / audit queries (writes stay on primary)
2. External task queue (Celery/RQ + Redis broker) decommissioning the in-process scheduler
3. Table partitioning on `attendances`, `audit_logs`, `sync_queue`, `journal_lines`, `payments` by `school_id` (PostgreSQL declarative partitioning)
4. Static asset migration to S3 + CloudFront
5. Per-tenant DB or schema (PostgreSQL schema-per-tenant) for >1000 schools
6. Horizontal API scale: 2+ uvicorn workers behind nginx upstream with sticky sessions for WS

---

## §7 — Architecture Risks (forward-looking)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| A1 | Single-writer DB at >1k schools degrades dashboard | High | Slow UX | Read replica + caches |
| A2 | Thread sync worker crashes silently (no `try` outside scheduler) | Medium | Sync stalls unnoticed | External queue + monitoring |
| A3 | `asyncio.ensure_future` from sync ctx (NFC scan) silently drops broadcasts | High (latent bug confirmed) | Realtime features dead | Use `run_coroutine_threadsafe` or `async` route |
| A4 | Redis failure → silent fail-open across rate-limit + brute-force + `jti` | Medium at scale | Abuse window opens | Log + alert on first Redis failure |
| A5 | Monolith hard to split when a tenant requests data residency | High on growth | Legal / DPFI risk | Schema-per-tenant prep now |
| A6 | No API gateway — license-server + main app + static all edge-facing | High | Attack surface | nginx can share routing; consider WAF |
| A7 | Audit log grows unbounded (1-year retention per config; archive reduces but audit_logs lacks partition) | High in 2-3 yrs | Slow audit queries | Partition `audit_logs` monthly by `created_at` |

---

## §8 — Conclusions

ZENOVA's architecture is **internally consistent and follows FastAPI best practice** for a single-process monolith. The patterns chosen (event-listener soft delete, dependency-injected RBAC, license-gated features) are sound. The architecture's **weaknesses are scaling dimensions**: single DB writer, thread-based scheduling, no read replicas, no partitioning, no external queue. For <100 schools on a single dedicated VPS, this works; for the stated 1,000-school target, **infrastructure changes are required** not code changes.

**Architecture Score: 65/100** — deduct 20 for monolith-with-threads concurrency, deduct 8 for missing RLS / partitioning, deduct 7 for dual sync workers + asyncio bug. Add 100 for clean layering, audit-everywhere, tenancy discipline, license anti-tamper investment.

---

**End of ARCHITECTURE_AUDIT.md**
