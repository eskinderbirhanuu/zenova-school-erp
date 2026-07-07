# ZENOVA — Master Audit Report

**Date:** 2026-07-06
**Auditor:** GLM-5.2 (Z-Ai) — Senior Software Architect / Principal Security Engineer / Senior DevOps / Senior Backend / Senior Frontend / Database Architect / Cloud Security / Penetration Tester (composite)
**Project:** ZENOVA Enterprise School Management Platform — FastAPI + Next.js 16 + PostgreSQL 16 hybrid (local + cloud) ERP for 500–20,000-student schools.
**Method:** Static analysis across entire repository. **NO code modified. NO business logic modified.** Read, analyze, inspect, find issues, vulnerabilities, bugs, bad practices, missing features, future risks, write reports.
**Scope:** 16 component-level audit reports (this is the master synthesis).

---

## §1 — Component Reports Index

Each report lives in `docs/`:

| # | Report | Findings |
|---|---|---|
| 1 | `SECURITY_AUDIT.md` | 7 Critical, 11 High, 16 Medium, 8 Low |
| 2 | `ARCHITECTURE_AUDIT.md` | 7 forward-looking risks |
| 3 | `DATABASE_AUDIT.md` | AuditLog null, Float-for-money, missing FK indexes, 4 critical |
| 4 | `API_AUDIT.md` | ~320 routes; ≥6 IDOR; rate-limit gaps; float-for-money schemas |
| 5 | `FRONTEND_AUDIT.md` | localStorage-vs-cookie bug; no security headers; F1-F10 |
| 6 | `BACKEND_AUDIT.md` | asyncio silent broadcast; double sync worker; transaction antipattern; observability gaps |
| 7 | `DEVOPS_AUDIT.md` | Root containers; secrets in git; no CI security scan; plaintext backups |
| 8 | `LICENSE_SYSTEM_AUDIT.md` | Cloud issuance unauthenticated; fingerprint binding silently null; joy entropy mismatch |
| 9 | `ANTI_PIRACY_AUDIT.md` | 5 bypass scenarios enumerated |
| 10 | `PERMISSIONS_AUDIT.md` | 14 permission findings P1–P14 |
| 11 | `PERFORMANCE_AUDIT.md` | N+1 in 3 dashboards; 13 PF findings |
| 12 | `CODE_QUALITY_AUDIT.md` | 12 CQ findings; duplication; type hints |
| 13 | `DEPENDENCY_AUDIT.md` | 4 High CVEs + supply-chain risk on `lucide-react` |
| 14 | `BACKUP_AUDIT.md` | 13 B findings |
| 15 | `PRODUCTION_READINESS_REPORT.md` | Full document of 12 deploy-blockers + 18 high-impact items |

Prior audits superseded by this report:
- `docs/SECURITY_AUDIT_2026-06-30_GLM.md` (GLM, 2026-06-30)
- `docs/ARCHITECTURE_REVIEW_2026-06-30_GLM.md`
- `docs/PERFORMANCE_AUDIT_2026-06-30_GLM.md`
- `docs/audit/MASTER_AUDIT_REPORT.md` (Copilot/kimi, 2026-07-04, score 68/100)

---

## §2 — Critical Issues (17 total across all reports)

These are deployed-blocker findings. Each is exploitable today either locally, by insiders, or by anyone on the internet.

| # | Title | Source | Exploit Vector | File |
|---|---|---|---|---|
| C1 | License-server `/license/generate`, `/admin/dashboard`, `/schools/*` NO AUTH | SECURITY §1 | Internet → `/api/v1/license/generate` mint unlimited licenses + PII dump | `license-server/app/api/v1/endpoints/licenses.py:44`; `admin.py:12` |
| C2 | License-server CORS `*` + credentials — spec violation | SECURITY §1, DEVOPS | Browser → CSRF to cloud admin via credentialed origins | `license-server/app/main.py:18` |
| C3 | `/installer/connect-vps` is **unauthenticated SSRF** | SECURITY §1, API | Internet → POST `/installer/connect-vps` → school's sync data routed to attacker URL | `backend/app/api/v1/endpoints/installer.py:314` |
| C4 | Telegram webhook no signature | SECURITY §1 | Internet → POST `/telegram/webhook/{school_id}` forges any webhook payload | `backend/app/api/v1/endpoints/telegram.py:40` |
| C5 | `/sync/receive` HMAC doesn't sign body | SECURITY §1, API | Captured sync envelope can be replayed/modified — record injection | `backend/app/api/v1/endpoints/sync.py:95` |
| C6 | `/settings` writable by any authenticated user | SECURITY §1, PERMISSIONS P1 | Authenticated STUDENT rewrites school config; no audit log | `backend/app/api/v1/endpoints/settings.py:25` |
| C7 | NFC card UIDs stored plaintext + cross-table collisions | SECURITY §1, ANTI_PIRACY | $10 reader clones; same UID in student + staff tables | `backend/app/models/{student,staff,parent,employee}_card.py` |
| C8 | License fingerprint binding silently no-ops on hardware probe failure | LICENSE §4.3 | Stolen .lic + null fingerprint → activate on any hardware | `backend/app/services/license_service.py:130`; `license_crypto.py:777` |
| C9 | License-server `/auth/school/login` no password check | SECURITY C1, DEVOPS D2 | Any known email → JWT issuance → impersonate any school | `license-server/app/api/v1/endpoints/auth.py:42-49` |
| C10 | K8s `secret.yaml` plaintext `stringData` committed to git | DEVOPS D3 | Anyone with read access to repo has cluster secrets | `k8s/secret.yaml` |
| C11 | VPS `backup-worker` plaintext `pg_dump` on shared volume | BACKUP B1 | Anyone with read access to host filesystem = full DB | `deploy/docker-compose.vps.yml:96` |
| C12 | Backend backup encryption disabled by default | BACKUP B2 | Default deployment has no encryption at rest for backups | `.env.example` + `backup_service.py:64` |
| C13 | `AuditLog.school_id` NEVER populated | DB §2.2 | Per-tenant audit forensics impossible | `backend/app/core/audit.py` + 160 callers |
| C14 | `/corporate/*` no school_id tenant filter | SECURITY H6, PERMISSIONS P3 | Any auth user reads/writes employees across all tenants | `corporate.py:*`; `corporate_service.py` |
| C15 | Float-for-money in 3 model columns | DB §4.1 | Currency rounding/reconciliation errors accumulate | `library_fine.py:16`, `inventory_asset.py:14`, license-server `Subscription.amount` |
| C16 | Supply-chain: `lucide-react@^1.21.0` (non-existent major) | DEP DEP4 | Frontend bundle could pull typo-squat from npm registry | `frontend/package.json:29` |
| C17 | Dependency CVEs: `python-jose==3.3.0`, `openpyxl==3.1.5`, unpinned `python-multipart` | DEP DEP1-DEP3 | JWT alg DoS + alg confusion; Excel DoS; supply chain risk + CVE | `backend/requirements.txt` |

---

## §3 — High Risks (consolidated 28 items)

### §3.1 — Cross-tenant leaks (IDOR)

| # | Endpoint | File | Risk |
|---|---|---|---|
| H1 | `/parent-payments/refund/{id}/approve` | `parent_payments.py:279` | FINANCE user approves refund in another school |
| H2 | `/parent-payments/refund/request` | `parent_payments.py:249` | Any parent requests refund for any payment |
| H3 | `/qr/{uuid}` | `qr.py:29` | Unauthenticated PII leak (reference_id student/parent UUIDs) |
| H4 | QR `_generate_encrypted_token` is plain base64 | `qr_service.py:11` | Misleading security name; unsigned tokens |
| H5 | `/nfc/{student\|staff\|parent\|employee}/by-card/{uid}` | `nfc_v2.py:111,131,150,167` | PII leak cross-tenant by UID enumeration |
| H6 | `/corporate/*` no school_id | `corporate.py:*` | Cross-tenant employee/department PII + mutations |
| H7 | `/card-design/{school_id}` path-param IDOR | `card_design.py:13,25` | Any auth user reads/overwrites any school's design |
| H8 | `/platform/admin/dashboard` and `/iga/*` no perm | `platform_commission.py:47+`, `iga.py:14+` | Any auth user sees platform revenue + server topology |
| H9 | `/activate/employees/create` allows `role_name="SUPER_ADMIN"` | `activate.py:251` | Director escalates to SUPER_ADMIN role |
| H10 | Cloud license key entropy 64-bit | `license-server/app/services/license_service.py:13` | Cloud keys 2^192× easier to brute-force |
| H11 | `UserUpdate.role_id` settable to SUPER_ADMIN role_id | `users.py:46` | Admin promotes user to SUPER_ADMIN role without `is_superuser=True` |

### §3.2 — Infrastructure / deployment hardening

| # | Issue | Source |
|---|---|---|
| H12 | Backend Docker / k8s backend+frontend run as root | DEVOPS D5 |
| H13 | K8s has no NetworkPolicy | DEVOPS D6 |
| H14 | Redis has no `requirepass` (dev, VPS, k8s) | DEVOPS D7 |
| H15 | CI: no security scanning, no image push | DEVOPS D8 |
| H16 | CI `test-frontend` runs 0 tests | DEVOPS D9 |
| H17 | Nginx prod missing HSTS, CSP, rate-limit; `/health` hardcoded 200 | DEVOPS D10 |
| H18 | Python/Node version skew CI vs Docker | DEVOPS D11 |
| H19 | asyncio.ensure_future from sync ctx silently kills NFC broadcasts | BACKEND §5, PERF PF5 |
| H20 | Float-for-money schemas across all of finance, cafeteria, HR, inventory | API V1 |
| H21 | Missing FK indexes on 7 hot N+1 paths | PERF PF4 |
| H22 | No backup restore procedure (manual `psql` only) | BACKUP B3 |
| H23 | No CI security scan in pipeline | DEP DEP6 |
| H24 | `email-validator` declared but unused (auth schemas use `str` for email) | CODE_QUALITY CQ6 |
| H25 | License fingerprint silent no-op on Windows `wmic` timeout | LICENSE §4.3 |
| H26 | No push invalidation on license revoke → 30-min stale window | LICENSE §4.5 |
| H27 | Legacy `nfc.py` + `nfc_service.py` not removed alongside V2 | CODE_QUALITY CQ7 |
| H28 | Cloud license-server SQLite + single-process (no concurrency, no WAL) | DEVOPS §7 |

---

## §4 — Medium Risks (consolidated ~40 items)

Grouped, not enumerated:

**Authorization:** `UserUpdate.role_id` unlocked ceiling; `/branches/{id}` PATCH/DELETE no perm; `/telegram/bot/connect` no perm; `/audit-logs` silent-empty for non-super; `/nfc/employee/assign` no perm.

**Validation:** invoice lines arbitrary `dict`; `PUT /settings` arbitrary dict body; `PATCH /attendance/{id}` arbitrary dict body; `POST /parent-payments/refund/request` query-param body (not body schema); `email` using `str` not `EmailStr`.

**Error handling:** No global exception handler (staging leaks tracebacks); webhook errors leak internal Chapa strings; `/installer/whoami` reveals school-existence; brute-force fail-open silent.

**Operations:** Recovery-code issue not audited; QR `expires_at` nullable; SupportTicket `school_id` nullable; `NfcScanLog.school_id` nullable + not enforced; license `key` no length/pattern constraint at DB layer.

**Code quality:** `include_deleted` ×30 duplication; transcript mapping loop ×3 duplication; auth cookie-set ×3; service-layer `db.commit()` violates caller-tx rule.

**Tests:** No N+1 isolation tests; no IDOR-specific tests; frontend E2E absent.

**Performance:** Unbounded list endpoints (academic, parents search); Excel exports load entire query in memory; dashboard COUNT cascade per request; no app-data Redis caching.

**DevOps:** K8s missing PDB, HPA, topologySpread, RBAC, PodSecurity; `scripts/deploy.sh` duplicates `deploy/deploy.sh`; systemd runs as `User=root`.

---

## §5 — Low Risks (consolidated ~20 items)

- `/sync/receive` ±no replay window (currently no window check)
- Webhook error-detail leakage
- Bare `except` in scheduler
- Missing FK indexes on cold paths
- Unbounded GET endpoints (academic, promotions, staff)
- Long files (license_crypto 688 LOC)
- Permission enum naming inconsistency (`STUDENTS_VIEW` vs `STUDENT_*`)
- Louisville `redis.CLIENT_SETINFO` warnings
- Default `MASTER_SETUP_KEY:-` allows empty in dev compose
- Self-signed cert no renewal cron
- `scripts/__pycache__/` potentially committed
- WS auth origin check missing
- `/metrics` endpoint unauthenticated (acceptable operational)
- CORS for license-server `*`-with-credentials
- Telegram WS not necessarily impersonated via secret token

---

## §6 — Answers to the Original Audit Questions

| # | Question | Answer |
|---|---|---|
| 1 | Is the system secure? | **No.** 17 critical findings; license-server, /settings, /installer/connect-vps, NFC plaintext, sync-receive body not signed — all exploitable today. |
| 2 | Is the architecture scalable? | **Workable for <500 schools; needs work for 1,000+** — monolith with thread sync worker + single-writer DB + no partitioning + no read replica + no external task queue. |
| 3 | Is the code maintainable? | **Yes** — clean layering, idiomatic FastAPI, 148 tests, consistent style, max file 688 LOC. |
| 4 | Is the database safe? | **Partially** — no RLS; 3 Float-for-money columns; `AuditLog.school_id` never populated; 7 models missing `school_id`; missing FK indexes on hot paths. |
| 5 | Can the project be pirated? | **Yes, trivially** — cloud license `/generate` endpoint unauthenticated; <1-minute bypass via curl. |
| 6 | Can the APIs be abused? | **Yes** — 6 IDOR paths confirmed; missing rate limits on `/setup/*`, `/installer/*`, `/qr/{uuid}`, `/nfc/public/lookup`, `/telegram/webhook`. |
| 7 | Can the server be hacked? | **Possible** — containers run as root; nginx missing WAF; no CI security scanning; backups plaintext. |
| 8 | Can data leak? | **Yes** — `/corporate/*`, `/nfc/*/by-card/{uid}`, `/parent-payments/refund/*`, `/qr/{uuid}`, `/installer/whoami` actively leak cross-tenant; plaintext backups leak full DB. |
| 9 | Can schools attack each other? | **Yes** — 6 cross-tenant IDOR paths; `/platform/admin/dashboard` exposes aggregate PII; `/corporate/*` mutates any tenant. |
| 10 | Can employees abuse permissions? | **Yes** — `PUT /settings` writable by STUDENT; `UserUpdate.role_id` settable to SUPER_ADMIN; `/activate/employees/create` role_name accepts "SUPER_ADMIN"; `/branches/{id}` mutations without perm. |
| 11 | Can backups be stolen? | **Yes** — VPS `backup-worker` stores 7-day plaintext `pg_dump` on shared volume; backend encryption default off. |
| 12 | Can licenses be bypassed? | **Yes** — cloud `/generate` unauthenticated → mint unlimited keys; fingerprint binding silently no-ops → universal registration. |
| 13 | Is the system production ready? | **NO** — see PRODUCTION_READINESS_REPORT.md. 12 critical blockers + 18 high-impact items must close before deploying to multi-tenant SaaS. |

---

## §7 — Recommendations Consolidated (priority order)

### §7.1 — Phase 1: Critical blockers — close in 1–2 weeks

1. Add auth to cloud license-server: `/generate`, `/admin/dashboard`, `/schools/*` require `require_super_admin`; rewrite `/auth/school/login` with bcrypt — **4 hours**
2. Fix license-server CORS: explicit origins — **10 minutes**
3. `require_server_role("INSTALLER")` + URL allowlist + rate limit on `/installer/connect-vps` and `/installer/initialize-*` — **1 day**
4. Telegram webhook verify `X-Telegram-Bot-Api-Secret-Token` — **2 hours**
5. Extend sync HMAC to cover `sha256(body_bytes)` + add ±60s replay window — **4 hours**
6. Add `require_permission(SETTINGS_MANAGE)` to `PUT /settings`; typed Pydantic body — **5 minutes + 1 hour schema**
7. Hash NFC card_uid (SHA-256+salt); unify 4 card tables OR enforce cross-table uniqueness — **3 days**
8. `log_audit()` accept `school_id` arg; update 160 callers — **2 days (batched PRs)**
9. Replace K8s `Secret` with `SealedSecret` / `ExternalSecret` — **1 day**
10. Enable backup encryption by default (`BACKUP_ENCRYPT_ENABLED=true`); add `age` to backup-worker; use `backup_service.run_backup` flow instead of inline `pg_dump` — **2 days**
11. Schema migration: change `library_fine.amount`, `inventory_asset.value`, license-server `Subscription.amount` from `Float` → `DECIMAL(15,2)` — **2 hours**
12. Pin `python-jose==3.4.0`, `passlib==1.7.5`, `openpyxl`-latest-patch, `python-multipart==0.0.20`, `lucide-react@^0.460.0` — **1 hour**

**Phase 1 total: ~2 weeks of focused work**.

### §7.2 — Phase 2: High risks — close in 3 weeks

13. Thread `current_user.school_id` through IDOR endpoints: `/corporate/*`, `/nfc/*/by-card/{uid}`, `/parent-payments/refund/{id}/approve`, `/parent-payments/refund/request`, `/card-design/{school_id}`;
14. Add `require_permission(LICENSE_MANAGE)` to `/platform/admin/*` and `/iga/*`;
15. Cap `UserUpdate.role_id` to denylist SUPER_ADMIN for non-superuser; cap `/activate/employees/create` `role_name` denylist;
16. Sign QR payload with HMAC-SHA256; rename `_generate_encrypted_token` → `generate_qr_payload`;
17. Add missing rate limits to `/setup/*`, `/installer/*`, `/qr/{uuid}`, `/nfc/public/lookup`;
18. Reject `License.machine_fingerprint` if null after binding; cloud `verify` never set fingerprint (only `activate`, once);
19. Send license-revoked webhook to school server → instant Redis invalidation;
20. Container hardening: backend Dockerfile non-root + multi-stage; K8s runAsNonRoot + readOnlyRootFilesystem;
21. K8s NetworkPolicy: deny ingress to DB/Redis except from backend namespace; add PDB; add HPA; add topologySpread;
22. Redis `requirepass` everywhere; license-server SQLite → PostgreSQL + alembic;
23. Add CI security scanning: `pip-audit`, `npm audit`, Trivy images, Gitleaks;
24. Register global `@app.exception_handler(Exception)` returning generic 500 in non-dev;
25. Add `request_id` to logs via contextvars; add Sentry SDK;
26. Add Prometheus exposition format to `/metrics`; add `prometheus-fastapi-instrumentator`;
27. nginx: HSTS, CSP, X-Frame-Options, Referrer-Policy, rate-limit; replace hardcoded `/health`;
28. Add Let's Encrypt renewal cron; replace `scripts/deploy.sh` with single `deploy/deploy.sh`;

**Phase 2 total: ~3 weeks**.

### §7.3 — Phase 3: Performance & quality — 2 weeks

29. Fix N+1 in parent_portal, student_portal, students transcript (batch fetches via `selectinload`/`IN`);
30. Add missing FK indexes (`parent_student_link.student_id`, `attendance.student_id`, `exam_result.*`, `wallet_transaction.wallet_id`, `message.sender_id/recipient_id`, `inventory_movement.item_id`, `contract.staff_profile_id`, `leave_request.staff_profile_id`) via Alembic migration;
31. Fix `asyncio.ensure_future` from sync ctx: capture main loop in startup, use `asyncio.run_coroutine_threadsafe`;
32. Enforce pagination (`?skip=&limit=` max 1000) on all list endpoints;
33. Excel exports use `StreamingResponse` with `openpyxl write_only`;
34. Add Redis cache (TTL 60s) for dashboard COUNTs;
35. Extract helpers: `can_see_deleted(current_user)`, `set_auth_cookies(response, ...)`, `build_result_map(results, exams_by_id)`;
36. Add N+1 isolation tests + IDOR tests + Playwright E2E;
37. Sunset legacy `nfc.py` returning 410 Gone;
38. Sunset `email-validator` dep OR migrate `email: str` → `EmailStr` in auth schemas.

**Phase 3 total: ~2 weeks**.

### §7.4 — Phase 4: Anti-piracy & anti-theft (optional but recommended) — 2 weeks

39. Activate backend Nuitka compilation for services on Linux; ship `coreval.so` equivalent; reject .lic if extension absent on Linux;
40. Activate frontend `javascript-obfuscator` post-build; remove explicit source maps in prod builds;
41. Cosign / Sigstore image signing on published Docker images;
42. Add honeytokens (fake secrets in env / data files) that trigger alerts if exfiltrated;
43. Adopt PostgreSQL Row-Level Security on every tenant-scoped table — set policy `USING (school_id = current_setting('app.current_school_id'))` — pass `SET app.current_school_id = X` per DB session (`get_db()` dependency);
44. Add offsite backup upload to S3 with SSE-KMS; generate sha256 checksum next to file;
45. Implement `restore_backup(filename)` service + `POST /api/v1/backups/{filename}/restore` endpoint guarded by `LICENSE_MANAGE`; add nightly restore-test CI job;

---

## §8 — Future Risks (Long-Term)

| # | Risk | Mitigation |
|---|---|---|
| FR1 | Monolithic all-in-one process struggles with >500 schools | Move sync/backup/archive to Celery + worker broker; allow API to scale horizontally |
| FR2 | Unpartitioned `attendances` table grows ~500M rows/year at 1000 schools | Partition monthly by `created_at` (PostgreSQL declarative) |
| FR3 | Unpartitioned `audit_logs` grows ~1B/year at scale | Partition yearly + cold-archive by `archive_service` |
| FR4 | No data residency plan for tenant-specific legal constraints | Schema-per-tenant migration prep now → can split when needed |
| FR5 | No multi-region / DR site | Plan B VPS in different cloud provider; replicated DB; tested quarterly DR drill |
| FR6 | License-server single-point-of-failure | Make it self-healing — PostgreSQL backend + multi-replica + load balancer |
| FR7 | Front-end heavy dep (Three.js) at scale without code-splitting | Move heavy libs to dashboard-only `next/dynamic` imports |
| FR8 | No customer isolation RLS — every missed filter becomes massive data leak | PostgreSQL RLS at DB layer |
| FR9 | Personnel source security (single contributor's disk with `backend/.env` SECRET_KEY) | Lock down via KMS + ensure `backend/.env.example` only — never commit real secrets; rotate SECRET_KEY quarterly |
| FR10 | Backup ransomware — attacker steals + deletes local backups | Off-site S3 with versioning + delete-MFA |

---

## §9 — Overall Scores (Final)

### §9.1 — Per-domain scores

| Domain | Score | Ratio |
|---|---|---|
| Security | 45/100 | Critical |
| Architecture | 65/100 | Moderate |
| Database | 70/100 | Acceptable |
| API | 70/100 | Acceptable |
| Frontend | 62/100 | Moderate |
| Backend | 72/100 | Acceptable |
| DevOps | 55/100 | Critical |
| License System | 55/100 | Critical |
| Anti-Piracy | 35/100 | Critical |
| Permissions | 65/100 | Moderate |
| Performance | 60/100 | Moderate |
| Code Quality | 70/100 | Acceptable |
| Dependencies | 65/100 | Moderate |
| Backup & Recovery | 45/100 | Critical |

### §9.2 — Final Three Scores

**Overall Security Score: 45 / 100**

Strong defense-in-depth (bcrypt 12, MFA, JWT type enforcement, CSRF, brute-force, security headers, license anti-tamper C-extension, 8-component hardware fingerprint, structured logging, soft-delete, audit-everywhere) is **negated** by 17 critical exploits: cloud license issuance unauthenticated, `/settings` writable by students, `/installer/connect-vps` SSRF, sync body not signed, telegram forgeable, NFC plaintext + cross-table collisions, AuditLog.school_id never populated, K8s secrets in git, plaintext backups, root containers. Each is a configuration fix, not architectural redesign.

**Overall Architecture Score: 65 / 100**

Clean modular design, idiomatic FastAPI, consistent tenancy pattern (with 7 documented exceptions), 148 tests, structured logging, scheduled archive/backup, graceful shutdown. **Weaknesses**: monolith-with-threads concurrency, dual sync workers on shared queue no row-locking, asyncio silent broadcast bug, single-writer DB, no read replicas, no external task queue, no table partitioning, no RLS — all of which surface only beyond ~500 schools.

**Overall Production Readiness Score: 35 / 100 today; ~75 / 100 after Phase 1+2 (~5 weeks)**

---

## §10 — Final Decision

> **Can this system safely be deployed to production right now?**
>
> **NO.**

### Reasoning:

- **17 critical findings** — each independently sufficient to block production deployment to a multi-tenant SaaS serving thousands of schools.
- The license-server is **the single most serious weakness**: any internet attacker can mint unlimited license keys, drain all customer PII, and impersonate any school. This voids the entire RSA-PSS + 8-fingerprint + coreval.pyd anti-piracy investment.
- Multiple cross-tenant IDOR endpoints permit data leakage and mutation between schools — the multi-tenant guarantee is currently broken at ~6 specific code paths.
- Insider abuse is trivial: a STUDENT can rewrite school settings, a director can escalate to SUPER_ADMIN role, FINANCE users can approve refunds in any school.
- Backups are plaintext by default and on shared volume — a stolen backup file is full DB disclosure.
- K8s secrets are committed to git in plaintext; containers run as root; no CI security scanning.
- 3 Float-for-money DB columns and 40+ `float`-for-money schema fields violate the stated "Decimal for money, never float" project rule.
- Cloud license key entropy is 64-bit while local key entropy is 256-bit.

### Path to Production:

1. **Phase 1 (2 weeks)**: Close 17 critical blockers. Achieves 65/100.
2. **Phase 2 (3 weeks)**: Close 28 high-impact items. Achieves 75/100. Acceptable for trusted-pilot single-school deployment.
3. **Phase 3 (2 weeks)**: Close 10 medium performance/quality issues. Achieves 85/100. Acceptable for multi-school SaaS at <100 schools.
4. **Phase 4 (2 weeks)**: Adopt PostgreSQL RLS + Celery external worker + DB read replicas + partitioning + Nuitka/PyArmor obfuscation + Cosign image signing + Sentry / OpenTelemetry + WAF. Achieves 92+/100. Acceptable for 1,000-school SaaS.

**No architectural redesign required anywhere — every recommendation is a configuration/authorization fix or an additive hardening step.** The foundation (FastAPI modular design, license anti-piracy investment, audit-everywhere discipline, soft-delete, MFA, Bcrypt 12, structured logging, 148 tests) is stronger than typical ERP projects. The gap is **operational knobs misconfigured** — close those knobs and the system is deployable.

---

## §11 — Audit Report manifest

All 16 audit reports created in `docs/`:

| # | File |
|---|---|
| 1 | `docs/SECURITY_AUDIT.md` ← (this report's parent) |
| 2 | `docs/ARCHITECTURE_AUDIT.md` |
| 3 | `docs/DATABASE_AUDIT.md` |
| 4 | `docs/API_AUDIT.md` |
| 5 | `docs/FRONTEND_AUDIT.md` |
| 6 | `docs/BACKEND_AUDIT.md` |
| 7 | `docs/DEVOPS_AUDIT.md` |
| 8 | `docs/LICENSE_SYSTEM_AUDIT.md` |
| 9 | `docs/ANTI_PIRACY_AUDIT.md` |
| 10 | `docs/PERMISSIONS_AUDIT.md` |
| 11 | `docs/PERFORMANCE_AUDIT.md` |
| 12 | `docs/CODE_QUALITY_AUDIT.md` |
| 13 | `docs/DEPENDENCY_AUDIT.md` |
| 14 | `docs/BACKUP_AUDIT.md` |
| 15 | `docs/PRODUCTION_READINESS_REPORT.md` |
| 16 | `docs/MASTER_AUDIT_REPORT.md` ← (this file) |

**No code was modified during this audit. No business logic was changed. Only reports were written.**

---

*End of MASTER_AUDIT_REPORT.md*
