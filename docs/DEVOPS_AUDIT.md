# ZENOVA — DevOps / Deployment Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Senior DevOps Engineer / Cloud Security Engineer role
**Method:** Static analysis of Dockerfiles, compose files, k8s manifests, nginx configs, CI/CD workflows, deploy scripts. No code modified.
**Scope:** Backend Docker, frontend Docker, dev + VPS docker-compose, k8s/, deploy/, scripts/, nginx/, license-server/, .github/workflows/, environment files.

---

## Executive Summary

ZENOVA ships two deployment targets: dev `docker-compose.yml` (root) and a hardened-VPS `deploy/docker-compose.vps.yml`. K8s manifests are present in `k8s/` (9 files). CI exists as a single `.github/workflows/ci.yml` that lints and runs tests but **does not run frontend tests, no security scanning, no image build/push, no deploy automation**. Containers run **as root** in both backend Docker and K8s. K8s secrets are stored as plaintext `stringData` committed to git. Backups are unencrypted by default. The systemd unit runs `docker compose up` as `User=root`.

| Score | Dimension | Notes |
|---|---|---|
| 55/100 | Container security | Root everywhere; no nonRoot/disallowPrivilegeEscalation |
| 50/100 | Secret management | k8s secret.yaml in git, default `super_admin_password` |
| 50/100 | CI/CD | Lints + tests only; no build/push/deploy/security-scan |
| 60/100 | Compose config | dev publishes DB/Redis to host; VPS uses `expose:` |
| 55/100 | K8s manifests | Missing NetworkPolicy, RBAC, PDB, HPA, runAsNonRoot |
| 55/100 | Nginx | Missing CSP, HSTS, rate limits in prod |
| 40/100 | Backup/restore | Default unencrypted; no restore script; ephemeral retention |

---

## §1 — Dockerfiles

### §1.1 — `backend/Dockerfile` (16 lines)

- Base: `python:3.12-slim` ✓
- **NOT multi-stage** — final image still carries `gcc libpq-dev` build deps
- **No `USER` directive** — runs as root
- **No `HEALTHCHECK`** — relies on docker-compose healthcheck
- Entrypoint runs `alembic upgrade head` then `uvicorn`
- Python in CI: 3.14 — Docker: 3.12 — **version skew**

### §1.2 — `frontend/Dockerfile` (41 lines)

- Multi-stage ✓ (`deps` → `builder` → `runner`)
- **Non-root user `nextjs:nodejs`** (uid 1001) ✓ `USER nextjs`
- `output: standalone` ✓
- **No `HEALTHCHECK`** in Dockerfile
- Base: `node:20-alpine` — CI uses Node 22 → **version skew**

### §1.3 — Recommendation

Backend:
1. Switch to multi-stage: `python:3.12-slim` build with `gcc libpq-dev` → copy built `.venv` to `python:3.12-slim` runtime.
2. Add `USER nonroot:nonroot` with `USER 1001` after creating the user; `mkdir -p /app/data && chown -R 1001:1001 /app/data`.
3. Add `HEALTHCHECK CMD curl -fsS localhost:8000/api/v1/health/ready || exit 1`.

Frontend: add HEALTHCHECK `wget -q -O- localhost:3000/api/health || exit 1` and address Node version skew.

---

## §2 — `docker-compose.yml` (dev)

```yaml
services:
  db: postgis/postgis:16-3.4-alpine
    environment:
      POSTGRES_PASSWORD: zenova_pass         # weak default
    ports: ["5432:5432"]                      # published to host (dev only — risky in CI)
  redis: redis:7-alpine
    ports: ["6379:6379"]
    # NO requirepass — open Redis
  backend: ... SECRET_KEY: ${SECRET_KEY:?error} ✓
    ports: ["8000:8000"]
  frontend: ... (no HEALTHCHECK)
  nginx: nginx/                              # edge proxy
```

**Issues:**

| # | Severity | Issue |
|---|---|---|
| 1 | High | Redis has no `requirepass` — open on host:6379 |
| 2 | High | DB password `zenova_pass` weak default — anyone who reads compose can connect |
| 3 | Medium | DB port 5432 + Redis 6379 published to host — fine for dev, risky in non-localhost dev (CI / shared VPS) |
| 4 | Medium | `MASTER_SETUP_KEY:-` (allows empty) — setup endpoint would be unprotected if env not set |
| 5 | Low | No `depends_on: healthy:` régime in frontend for backend `healthy` — frontend can 502 during startup |

---

## §3 — `deploy/docker-compose.vps.yml` (VPS prod)

```yaml
services:
  db: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD required} ✓
  redis: redis:7-alpine  # still no requirepass
  backend: ...
  frontend: ...
  nginx: ...
  sync-worker: ... (no HEALTHCHECK) ✓ separate worker container
  backup-worker:
    command: sh -c "while true; do pg_dump ... && find /backups -mtime +7 -delete; sleep 86400; done"
    volumes: ["./backups:/backups"]
```

**Issues:**

| # | Severity | Issue |
|---|---|---|
| 1 | **Critical** | backup-worker creates **plaintext `pg_dump` for 7-day retention** on shared Docker volume — anyone with read access to `./backups` has full DB |
| 2 | High | Redis still no `requirepass` even in prod VPS |
| 3 | Medium | sync-worker has no `HEALTHCHECK` |
| 4 | Medium | Backup retention only 7 days on VPS — recovery window too short for forensic / ransomware recovery |
| 5 | Low | No Cron-style backup to offsite / S3 |
| 6 | Low | No `pg_dump --format=custom` for selective restore — plain text only |

---

## §4 — `k8s/` (9 files)

### §4.1 — `secret.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: zenova-secrets
type: Opaque
stringData:
  SECRET_KEY: "change-me-to-a-random-64-char-string"
  DATABASE_URL: "postgresql://zenova:zenova_pass@db:5432/zenova"
  MASTER_SETUP_KEY: ""
```

- **Plaintext committed to git** (placeholders only, but the pattern is wrong)
- Default `zenova_pass` shows up as a string

**Recommendation:** move to `SealedSecret` (Bitnami) or `ExternalSecret` (with AWS Secrets Manager / HashiCorp Vault). Never commit `Secret` resources — K8s `Secret` is just base64-encoded (= NOT encrypted).

### §4.2 — `db.yaml`

- StatefulSet + 10Gi PVC ✓
- Ready/liveness probes ✓
- **BUG**: `POSTGRES_PASSWORD` env-var reads `secretKeyRef.key: DATABASE_URL` (full URL) instead of `key: DB_PASSWORD` — Postgres won't get just the password

### §4.3 — `redis.yaml`

- **No password** (`--requirepass`) — open Redis in namespace
- **No PVC** — ephemeral Redis → lose jti blacklist / rate-limit counter on restart
- **No Resource limits**

### §4.4 — `backend.yaml`, `frontend.yaml`

- 2 replicas each ✓
- Ready + liveness probes ✓
- Resource requests + limits ✓
- **`tag: latest`** and **no `imagePullPolicy`** → defaults to `IfNotPresent` — stale-image risk
- **No `securityContext.runAsNonRoot`** — runs as root by default
- **No `readOnlyRootFilesystem`** — `tmpfs` for /tmp + writable dirs only

### §4.5 — `ingress.yaml`

- TLS via cert-manager + letsencrypt-prod ✓
- `ssl-redirect: true` ✓
- **Hosts hardcoded `*.example.com`**
- **No HSTS annotation**
- **No rate-limit annotations**
- **No CSP / X-Frame from ingress**

### §4.6 — **Missing entirely**

| Item | Impact |
|---|---|
| NetworkPolicy | Any pod can reach `db.zenova:5432` and `redis.zenova:6379` |
| RBAC / RoleBinding | ServiceAccounts default to cluster-wide discover |
| PDB (PodDisruptionBudget) | No min-available — node drain can drop both replicas |
| HPA (HorizontalPodAutoscaler) | No autoscaling on CPU or custom metric |
| `PodSecurity` admission / `restricted` policy | No enforcement of `runAsNonRoot`, `disallowPrivilegeEscalation` |
| `topologySpreadConstraints` | Both replicas can land on one node |
| `priorityClassName` | No preemption priority |

### §4.7 — Recommendation

Adopt a hardened baseline:

1. Replace `Secret` with `SealedSecret` or `ExternalSecret + Vault`.
2. Add NetworkPolicy denying ingress to `db` and `redis` from anywhere except `backend` namespace.
3. Add `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false` to every Deployment.
4. Add PDB with `minAvailable: 1` for both database and backend.
5. Tag images explicitly: `zenova-backend:1.0.0` and `imagePullPolicy: IfNotPresent`.
6. Add HSTS / `Content-Security-Policy` annotations to ingress.
7. Add `topologySpreadConstraints` so 2 replicas split across nodes.
8. Adopt `PodSecurity` admission `restricted` profile at namespace level.

---

## §5 — Nginx Configs

### §5.1 — `nginx/nginx.conf` (dev)

- HTTP-only
- Headers: `X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `X-XSS-Protection`
- **No CSP, no HSTS, no Referrer-Policy, no Permissions-Policy**
- `/health` returns hardcoded `200 "OK"` — **false-positives green during backend outage**

### §5.2 — `deploy/nginx.conf` (prod VPS)

- HTTP→HTTPS redirect ✓
- TLSv1.2/1.3, `HIGH:!aNULL:!MD5` ✓
- **No HSTS, no rate limiting (limit_req), no CSP**
- **No `ssl_session_*` tuning, no OCSP stapling**
- Self-signed cert (no renewal cron)

### §5.3 — `deploy/nginx/zenova.conf` (LAN)

- HTTP-only `zenova.local`
- **No TLS at all** for on-prem schools — plaintext cookies over HTTP

### §5.4 — Recommendation

- Add `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`
- Add `add_header Content-Security-Policy "default-src 'self'; ..."`
- Add `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;` and apply per API location
- Replace `/health` hardcoded 200 with `proxy_pass` to `/api/v1/health/ready`
- Add `ssl_session_cache shared:SSL:10m; ssl_session_timeout 1h;`
- Add Let's Encrypt cron renewal
- For LAN schools, install self-signed root CA + serve TLS; plaintext cookies on HTTP enable trivial session theft

---

## §6 — CI/CD (`.github/workflows/ci.yml`)

```yaml
jobs:
  lint-backend: ruff on python 3.14
  lint-frontend: eslint on node 22
  test-backend: pytest + postgres service on python 3.14
  test-frontend: npm test -- --passWithNoTests   ← runs 0 tests
  build: echo "build placeholder"
```

### §6.1 — Issues

| # | Severity | Issue |
|---|---|---|
| 1 | **Critical** | No security scanning (Trivy/grype images, pip-audit, npm audit, Gitleaks, Snyk) |
| 2 | High | No image build job — images are built locally and uploaded manually |
| 3 | High | No deploy automation — fully manual `deploy/deploy.sh` for VPS |
| 4 | High | `test-frontend: npm test -- --passWithNoTests` — **runs 0 assertions** |
| 5 | High | Python in CI 3.14 vs Docker 3.12 — version skew |
| 6 | High | Node in CI 22 vs Docker node:20-alpine — version skew |
| 7 | Medium | No coverage gate (codecov upload configured but no threshold) |
| 8 | Medium | No OIDC trust / id-token for cloud deploy (not relevant until deploy job exists) |

### §6.2 — Recommendation

Add to CI:

```yaml
- name: Security scan
  run: |
    pip install pip-audit
    pip-audit -r backend/requirements.txt --strict
    npm audit --audit-level=high
```

```yaml
- uses: aquasecurity/trivy-action@master
  with: { image-ref: "zenova-backend:latest", severity: "HIGH,CRITICAL" }

- uses: gitleaks/gitleaks-action@v2
```

Build & push images:

```yaml
- uses: docker/build-push-action@v5
  with:
    context: backend
    push: true
    tags: ghcr.io/${{ github.repository }}-backend:${{ github.sha }},:latest
```

Deploy with a protected branch using `environment: production` + required reviewers.

---

## §7 — `license-server/` (Separate Project)

### §7.1 — Stack

Python 3.12 (Docker), FastAPI + SQLAlchemy 2.0 + python-jose + pydantic-settings + SQLite (`sqlite:///./zenova_cloud.db`).

### §7.2 — Critical issues (cross-ref SECURITY C1-C2)

- `POST /api/v1/license/generate` — **NO AUTH dependency** → mint unlimited keys
- `GET /api/v1/admin/dashboard` — **NO AUTH** → PII dump of all schools/licenses
- `POST /api/v1/auth/school/login` — accepts any known email, **no password check**
- CORS `allow_origins=["*"]` + `allow_credentials=True` — spec-violating
- `super_admin_password: str = "change-me"` default — if env not set, admin is pw-default
- `secret_key="change-me-in-production"` default — JWTs forgeable if defaults leak

### §7.3 — Container

- `Dockerfile` 13 lines — runs as root, no multi-stage, no healthcheck

### §7.4 — Recommendation

Treat the license-server with the same security rigor as the school backend — it's the crown jewels.

1. Add authentication to every admin / generation route
2. Replace SQLite with PostgreSQL (concurrency, WAL-already-locks)
3. Move secrets to environment injection + K8s Secrets
4. Add fail-fast validating `SUPER_ADMIN_PASSWORD` length at startup
5. Add per-IP rate limit on `/verify`/`/activate` (currently unlimited)
6. Pin CORS origins to the admin UI only

---

## §8 — `deploy/` scripts

| File | Purpose | Issues |
|---|---|---|
| `deploy/deploy.sh` | Generate self-signed cert, build, up -d, run alembic | Self-signed cert valid 365d, **no renewal cron**; sets `O=ZENOVA/C=ET` |
| `deploy/setup-ubuntu.sh` | One-shot Ubuntu bootstrap: Docker + zenova user + systemd + static IP | **No HTTPS** (port 80 only). Uses 8.8.8.8 1.1.1.1 — fine. **Systemd runs as `User=root`** |
| `deploy/systemd/zenova.service` | oneshot docker up/down | Harden with `User=zenova` once Docker rootless enabled |
| `deploy/docker-compose.vps.yml` | VPS prod stack | See §3 |
| `deploy/nginx.conf` | prod edge | See §5.2 |
| `deploy/.env.vps.example` | placeholder | Safe (`replace-with-…`) |

---

## §9 — `scripts/` (root)

| File | Purpose | Issues |
|---|---|---|
| `scripts/deploy.sh` (67 lines) | "Deployment Script" — generates `.env` w/ `openssl rand` | **Duplicates `deploy/deploy.sh`**. Generates `DB_PASS=$(openssl rand -hex 16)` but never uses it (compose reads `DB_PASSWORD`, not `DB_PASS`) |
| | | Hardcoded `SCHOOL_WATERMARK=dev` in generated env |
| | | Uses curl on port 80 only |
| `scripts/add_deleted_at.py`, `check_migrations.py`, `seed_initial.py` | DB utilities | Not security-relevant |

---

## §10 — Environment / Secrets

| File | Status | Issues |
|---|---|---|
| `/.env` | git-ignored ✓ | `SECRET_KEY=test-deploy-secret-key-32-chars-minimum!!` (weak, dev only) |
| `/backend/.env` | git-ignored ✓ | Real `SECRET_KEY=B-...` present on local disk (acceptable always-local); `MASTER_SETUP_KEY=ZENOVA-MASTER-2026-A1B2C3D4`; `SUPER_ADMIN_EMAIL=eskinderbirhanuu@gmail.com` |
| `/.env.example` | tracked ✓ | Safe placeholders |
| `/backend/.env.example` | tracked ✓ | `SECRET_KEY=` empty + helper `python -c "import secrets;..."` ✓ |
| `deploy/.env.vps.example` | tracked ✓ | `replace-with-…` ✓ |

### §10.1 — Git hygiene (verified)

- `git ls-files | grep` for `.env`, `secret`, `key`, `pem`, `password`:
  - `backend/app/licensing/public_key.py` — **public** key, fine ✓
  - `backend/scripts/gen-license-keys.py` — script, fine ✓
  - `k8s/secret.yaml` — **plaintext placeholder secrets committed** (D3 above)
  - `*.env.example` — placeholders ✓
- `.env` (root + backend): **NOT tracked** ✓
- `backend/keys/*.pem`: **NOT tracked** ✓
- `*.lic` git-ignored ✓

---

## §11 — Backup Review (cross-ref BACKUP_AUDIT.md)

| Issue | Severity |
|---|---|
| Backup encryption **disabled by default** (`BACKUP_ENCRYPT_ENABLED=false` in `.env.example`) | High |
| VPS `backup-worker` **never encrypts** — 7 plaintext `pg_dump` files on shared volume | Critical |
| No `restore_backup()` function — manual `psql < file` only | Medium |
| No backup integrity checksum | Low |
| Cloud upload uses HTTP Basic Auth (credbles in transit OK if HTTPS, no integrity check) | Low |
| No off-site / S3 upload | Medium |

---

## §12 — Critical DevOps Findings Summary

| # | Severity | Finding | File |
|---|---|---|---|
| D1 | **Critical** | License-server `/generate`, `/admin/dashboard`, `/schools/*` NO AUTH | `license-server/app/api/v1/endpoints/*` |
| D2 | **Critical** | License-server `/auth/school/login` no password check | `license-server/app/api/v1/endpoints/auth.py:42` |
| D3 | **Critical** | `k8s/secret.yaml` plaintext `stringData` committed to git | `k8s/secret.yaml` |
| D4 | **Critical** | VPS `backup-worker` dumps plaintext `pg_dump` on shared volume | `deploy/docker-compose.vps.yml:96` |
| D5 | **High** | Backend Docker / K8s backend+frontend run as **root** | backend/Dockerfile, k8s/backend.yaml, k8s/frontend.yaml |
| D6 | **High** | K8s has **no NetworkPolicy** — Redis/DB open in namespace | k8s/ |
| D7 | **High** | Open Redis in dev compose + VPS + k8s (no `requirepass`) | docker-compose.yml:30-31, deploy/..., k8s/redis.yaml |
| D8 | **High** | CI: no security scanning, no build/push, no deploy automation | .github/workflows/ci.yml |
| D9 | **High** | CI: `test-frontend: npm test -- --passWithNoTests` — 0 tests | ci.yml:86 |
| D10 | **High** | nginx prod missing HSTS + CSP + rate-limit; `/health` hardcoded 200 | deploy/nginx.conf |
| D11 | Medium | Python/Node version skew: CI 3.14/22 vs Docker 3.12/20 | ci.yml, Dockerfile*s |
| D12 | Medium | No PDB, no HPA, no topologySpread on K8s Deployments | k8s/ |
| D13 | Medium | `deploy/setup-ubuntu.sh` runs systemd as `User=root` | deploy/setup-ubuntu.sh:87 |
| D14 | Medium | `scripts/deploy.sh` duplicates `deploy/deploy.sh`, generates unused `DB_PASS` | scripts/deploy.sh |
| D15 | Low | `deploy/deploy.sh` self-signed cert with no renewal cron | deploy/deploy.sh:21 |

---

## §13 — Recommended Hardening Priority

### Phase 1 (deploy-blocker)

1. Add auth to license-server (D1, D2)
2. K8s replace `secret.yaml` with SealedSecret (D3)
3. Enable backup encryption (`BACKUP_ENCRYPT_ENABLED=true` + key) and S3 upload (D4, BACKUP_AUDIT)
4. Backend Dockerfile: non-root user, multi-stage build (D5)
5. Add `redis:7-alpine --requirepass ${REDIS_PASSWORD}` everywhere (D7)
6. Add NetworkPolicy to k8s (D6)

### Phase 2 (1-week)

7. Add CI security scan (Trivy + pip-audit + npm audit + Gitleaks) (D8)
8. Add `npm test` after refactor — install Playwright or Jest (D9)
9. Align Python/Node versions between CI and Docker (D11)
10. Add nginx HSTS, CSP, rate-limit; replace hardcoded `/health` (D10)

### Phase 3 (2-week)

11. Add K8s PDB, HPA, topologySpread (D12)
12. Add image build + push job in CI with `:sha` tag
13. Add `environment: production` deploy job with manual approval
14. Add Let's Encrypt cron renewal
15. Sunset the duplicate `scripts/deploy.sh` (D14)

**DevOps Score: 55/100** — deduct 25 for no secret mgmt + root containers + no CI security scan + open Redis; deduct 15 for missing K8s hardening + nginx; deduct 5 for plaintext backups.

**End of DEVOPS_AUDIT.md**
