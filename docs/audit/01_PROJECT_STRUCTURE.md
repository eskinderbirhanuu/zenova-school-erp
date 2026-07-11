# 01 — PROJECT STRUCTURE AUDIT

**Generated:** 2026-07-11  
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

ZENOVA is a hybrid school ERP platform built with FastAPI (backend) + Next.js 16 (frontend) + PostgreSQL 16, deployed as a local school server with optional cloud VPS for parent/student portals. Overall structure is clean and well-organized, though there are some organizational inconsistencies and legacy leftovers.

**Score:** 7.5/10

---

## Current Implementation

### Top-Level Layout

```
ZENOVA/
├── backend/           # FastAPI application (monolith)
│   ├── app/
│   │   ├── api/v1/    # REST routers + endpoints (51 endpoint files)
│   │   ├── core/      # Auth, RBAC, rate-limit, scheduler, Redis, audit
│   │   ├── licensing/ # RSA keygen, C extension, anti-tamper
│   │   ├── models/    # 77 SQLAlchemy models in separate files
│   │   ├── schemas/   # 28 Pydantic schema modules
│   │   ├── services/  # 49 service modules
│   │   ├── utils/     # Excel, grading, UID hashing
│   │   ├── workers/   # Sync worker
│   │   ├── data/      # Runtime data (server_id.json, backups/)
│   │   ├── config.py  # Pydantic Settings
│   │   ├── database.py # Engine, session, soft-delete
│   │   └── main.py    # App factory + middleware stack
│   ├── alembic/       # 26 migrations, single linear chain
│   ├── tests/         # 12 test files
│   ├── scripts/       # Seed demos
│   ├── keys/          # RSA key pair storage
│   └── dist/          # Build artifacts
├── frontend/          # Next.js 16 app
│   └── src/
│       ├── app/       # 18+ role-scoped page groups (Next.js App Router)
│       ├── components/# Shared UI components
│       ├── hooks/     # React hooks
│       ├── lib/       # Utilities (1 file: utils.ts)
│       ├── services/  # API client, auth context, setup context
│       ├── config/    # App config
│       └── middleware.ts # RBAC routing guard
├── license-server/    # Cloud license management API
│   └── app/
│       ├── api/v1/endpoints/ # auth, licenses, schools, admin, monitoring
│       ├── core/       # Config
│       ├── models/     # SchoolLicense
│       └── services/   # License/service
├── deploy/            # Deployment scripts + VPS compose
├── k8s/               # Kubernetes manifests (10 files)
├── nginx/             # Reverse proxy config
├── release/           # Build/packaging scripts
├── scripts/           # Migration checker, seed, add_deleted_at
├── docs/              # 61 existing docs + 15 arch audit files
├── .github/workflows/ # CI/CD
└── graphify-out/      # Knowledge graph (AI tooling)
```

### Technology Stack (Consistent)

| Layer | What | Verdict |
|-------|------|---------|
| Backend framework | FastAPI 0.115.6 | Current, good |
| ORM | SQLAlchemy 2.0.36 | Modern declarative |
| DB | PostgreSQL 16 | Production-grade |
| Migrations | Alembic 1.14.1 | Clean 26-chains, single head |
| Auth | JWT (python-jose) + bcrypt (passlib) | Correct stack |
| Cache | Redis 7 | Used for rate-limit, token blacklist, brute-force |
| Frontend | Next.js 16.2.9 | Current App Router |
| UI | Radix UI + Tailwind CSS v4 + Shadcn | Modern |
| Charts | Recharts 2.15.0 | Functional |
| Animations | Framer Motion 12.40.0 | Modern |
| HTTP | Axios 1.18.0 | Standard |

---

## Strengths

1. **Clean module separation**: Backend has clear `api/`, `core/`, `models/`, `schemas/`, `services/` layers — a well-structured monolith.
2. **One model per file**: 77 model files, each named after its table. Easy to navigate.
3. **Linear Alembic history**: Exactly one head (`c5d6e7f8a0b1`), 26 migrations form a clean chain. No multi-head issues.
4. **Full deployment coverage**: Docker Compose (local + VPS), Kubernetes manifests, Ubuntu setup script, release packaging — all included.
5. **Middleware stack is well-defined**: CORS + SecurityHeaders + CSRF + RateLimit + UploadLimit + Metrics + RequestLogging + Watermark — in correct order.
6. **Role-scoped frontend routing**: 18 role-specific page groups under `(role)` convention — clean Next.js App Router layout.

---

## Weaknesses

1. **`app/api/v1/deps.py` is a re-export shim**: 24 lines re-exporting from `core/` modules. Adds indirection without value. Should be deprecated.
2. **Frontend `lib/` has only 1 file** (`utils.ts`). Very thin utility layer — most logic likely embedded in components.
3. **Circular import risk in licensing**: `license_crypto.py` imports from `database.py` and `models/`, while `main.py` startup calls `license_validator` → `license_crypto`. Works but fragile dependency chain across licensing modules.
4. **Models `__init__.py` imports 77 models**: Massive import surface. Any model import triggers all 77. Slow import on cold start (~1.5s). Not a runtime issue, just startup overhead.
5. **`backend/dist/`** — build output directory with unknown contents. Should be `.gitignore`d or documented.

---

## Issues Found

### Medium
| Issue | Location | Detail |
|-------|----------|--------|
| M1: Deprecated re-export shim | `api/v1/deps.py` | 24-line passthrough; new imports already go to `core/` directly |
| M2: License module circular import risk | `licensing/` | `coreval_wrapper.py` ↔ `license_crypto.py` ↔ `license_service.py` ↔ `license_validator.py` — fragile chain |
| M3: Models `__init__` imports all | `models/__init__.py` | 77 imports on every model access — startup latency |
| M4: `dist/` directory presence | `backend/dist/` | Build artifacts in source tree — add to `.gitignore` |

### Low
| Issue | Location | Detail |
|-------|----------|--------|
| L1: `graphify-out/` tracked? | root | Large AI-generated directory may bloat git — verify `.gitignore` |
| L2: Duplicate nginx configs | `nginx/` + `deploy/` | Two nginx configs (`nginx.conf` in root `nginx/`, `deploy/nginx.conf`) — slight divergence risk |
| L3: `coreval.pyd` in root | root | Compiled C extension loose at top level — should be in `backend/app/licensing/` |
| L4: `__pycache__/` tracked | multiple | Multiple `__pycache__/` dirs seen in exploration — verify `.gitignore` coverage |
| L5: `.pytest_cache/` tracked | `backend/` | Should be in `.gitignore` |
| L6: `uvicorn_err.txt` in backend root | `backend/` | Debug artifact — delete |
| L7: `node_modules/` in root | root | Package artifact at workspace root — orphan? |

### Observations (Not Issues)
- 51 endpoint files — large API surface but well-organized per domain
- 49 service files — services mirror endpoints closely (1:1 mapping typically)
- 28 schema files — schemas organized per domain matching services
- No "dead folders" found — every directory has active code
- No duplicate modules found
- No temporary/scratch files found in `app/`
- `TODO`/`FIXME`/`HACK` count in `backend/app/`: **0** (previously ~25, cleaned up)
- `print()` calls in `backend/app/`: **2** (down from earlier estimates, acceptable debug remnants)

---

## Recommended Improvements

1. **Deprecate `api/v1/deps.py`** — all consumers should import from `core/auth_deps.py` and `core/rate_limit.py` directly. Low effort, low risk.
2. **Add `dist/` to `.gitignore`** — build artifacts should not live in source tree. Low effort.
3. **Consolidate licensing imports** into a `licensing/__init__.py` facade to break circular import chain. Medium effort, medium risk.
4. **Split models `__init__`** into lazy-load patterns or per-domain submodules. Low priority (startup time <2s). Medium effort, low risk.
5. **Move `coreval.pyd`** into `backend/app/licensing/` directory. Trivial effort.
6. **Delete `uvicorn_err.txt`** — cleanup. Trivial effort.
7. **Consolidate nginx configs** — one canonical `nginx/` for local dev, `deploy/` for production. Ideally merge into one template. Low effort.

---

## Estimated Difficulty

Overall structural fixes: **Low**. No architectural redesign needed. Mostly cleanup and import hygiene.

---

## Priority

| Priority | Item |
|----------|------|
| P1 (now) | `.gitignore` hygiene (`dist/`, `__pycache__/`, `.pytest_cache/`, `uvicorn_err.txt`) |
| P2 (soon) | Consolidate licensing imports |
| P3 (later) | Deprecate `deps.py`, split model imports, merge nginx configs |

---

## Production Readiness: Structural

**Ready.** The monolith structure is mature, well-organized, and follows FastAPI conventions. No blockers for production from a structural standpoint.