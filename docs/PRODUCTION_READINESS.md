# Production Readiness Report — ZENOVA School ERP

**Date:** 2026-06-30 · **Analyst:** GLM-5.2 · **No code was modified.**

---

## 1. Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Security | 4 / 10 | Sound crypto primitives; several Critical wiring flaws (unauth `/sync/receive`, path traversal, license-key reset, broken payments path) |
| Multi-tenant isolation | 6 / 10 | Recent fixes good; IDOR remains (`promote_student`); no DB-level RLS |
| Data integrity (finance) | 6 / 10 | Double-entry logic correct, but audit self-commit + races + drift risks |
| Availability / resilience | 5 / 10 | Single worker, no queue, sync unimplemented, license ping can stall requests |
| Performance / scalability | 5 / 10 | N+1 in hot paths, COUNT-based numbers, missing indexes |
| Operability (migrations, backups, logs) | 5 / 10 | `create_all`+Alembic drift; backup endpoints vulnerable; thin tests |
| Code quality / maintainability | 6 / 10 | Clean structure, good domain modeling; dual RBAC, duplicated token logic |
| Test coverage | 2 / 10 | One test file; no role matrix, tenant, or concurrency tests |
| **Overall** | **5.5 / 10** | **Not production-ready.** Fix P0 in `DEEPSEEK_TASKS.md` → ~7.5/10; complete P1/P2 → ~9/10. |

---

## 2. Critical Blockers (must fix before any production deploy)

These are show-stoppers. None are subtle; all have step-by-step fixes in `DEEPSEEK_TASKS.md`.

1. **Default `SECRET_KEY` shipped** — forgeable SUPER_ADMIN JWTs on misconfigured deploys. [Task-09]
2. **Unauthenticated `/sync/receive`** — remote record injection / recon. [Task-01]
3. **Path traversal in `/backups/{filename}`** — credential disclosure + destructive delete. [Task-02]
4. **License-key = universal password reset** — full account takeover by any insider. [Task-03]
5. **Parent-portal payment path crashes** (`record_payment` signature drift) — 100% payment failure. [Task-04]
6. **`log_audit` self-commits** — breaks transactional integrity across finance/HR/academic. [Task-05]
7. **Cafeteria stock/wallet race** — oversell, negative stock, double-spent wallets. [Task-06]

---

## 3. High-Risk Areas (fix before scale, block before "many schools")

- **No DB Row-Level Security** — tenancy enforced only in app code; leaks are inevitable as the codebase grows. Adopt RLS. [Architecture §2.2]
- **`is_view_only` bypassed by `require_role`** — the "view-only outside network" rule is silently broken on most mutation routes. [Task-13]
- **Cross-tenant IDOR** in `promote_student` and likely a handful of similar fetches. [Task-08]
- **No MFA** for SUPER_ADMIN/ADMIN/FINANCE. [Security 3.5]
- **File uploads** with no size/type limits → DoS + stored XSS. [Task-11]
- **Sync plane is a stub** — the hybrid-cloud value prop is not delivered. [Task-19]
- **No background worker** — notifications/exports/backups run inline and block the single uvicorn worker. [Task-21a]
- **Test coverage ~near zero** for the risk surface. [Task-25]

---

## 4. Recommended Improvements (hardening, not blockers)

- Rate-limit `/auth/refresh`. [Task-10]
- Drop CSP `'unsafe-eval'` in production; add CORS regression test. [Task-12]
- Adopt Alembic-only migrations in production; stop `create_all`. [Task-14]
- Add composite indexes on hot query paths. [Task-21d]
- Unify the two RBAC systems; use `Role.level`. [Task-17]
- Encrypt PII columns (national IDs, medical notes); add retention/purge for soft-deleted records. [Security 3.3]
- Periodic financial reconciliation job. [Task-15]
- WebSocket token revocation re-check. [Task-18]

---

## 5. Deployment Checklist (operator-facing)

Before going live, the operator must:

- [ ] Set a strong `SECRET_KEY` (≥32 chars, random) — app now refuses to boot otherwise (post Task-09).
- [ ] Set `ENVIRONMENT=production` (enforces `cookie_secure=True`, hides `/docs`).
- [ ] Terminate TLS at Nginx (HSTS header is already sent; needs HTTPS to matter).
- [ ] Configure `ALLOWED_ORIGINS` to the exact FE origin(s); no `"*"`.
- [ ] Run `alembic upgrade head` (do not rely on `create_all`).
- [ ] Generate a per-server `sync_secret` only if sync is enabled; otherwise leave sync disabled.
- [ ] Provision Redis with AOF/Sentinel for HA (sessions, rate limits, license cache depend on it).
- [ ] Back up Postgres on a schedule; store backups **outside** the app directory with restricted perms.
- [ ] Restrict backend port 8000 to localhost; expose only Nginx :80/:443.
- [ ] Run the role-matrix + tenant-isolation test suites (post Task-25) against the staging deploy.

---

## 6. Verdict

ZENOVA is a **feature-complete, well-modeled ERP that is approximately one focused engineering pass away from production-viable**. The domain layer (double-entry accounting, soft-delete, hardware-bound licensing, role-based dashboards) is genuinely strong. What blocks production is a small number of **operational wiring defects** (unauthenticated endpoints, a path traversal, a password-reset design flaw, a broken payment call, a self-committing audit) plus the **absence of database-enforced tenancy and meaningful tests**.

Executing the **P0 tasks (1–9, minus 7/8 which are P1)** in `DEEPSEEK_TASKS.md` removes every Critical blocker and brings the system to a **defensible 7.5/10** — safe for a single-school pilot behind TLS with the operator checklist followed. Reaching **9/10 (multi-school SaaS scale)** additionally requires RLS, the real sync protocol, a worker queue, the performance pack, and the test scaffolding (P1/P2).

**Recommendation:** Proceed to implementation in the order given in `DEEPSEEK_TASKS.md` ("Suggested Execution Order"). Do not deploy to production until at least the P0 set is merged and verified by the new test suites.
