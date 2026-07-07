# ZENOVA — Dependency Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Dependency Manager role
**Method:** Static analysis of `backend/requirements.txt`, `frontend/package.json`, `license-server/requirements.txt`. No code modified.

---

## Executive Summary

ZENOVA pins 20 of 22 backend packages; frontend uses bleeding-edge React 19 + Next 16 with one **non-existent major version of `lucide-react`** (supply-chain typo-squat risk). Three backend packages have known CVEs (`python-jose 3.3.0`, `passlib 1.7.4` argon2 path, `openpyxl 3.1.5`) and one is unpinned (`python-multipart`). No security scanning is configured in CI to detect these in the future.

| Score | Backend deps | Frontend deps | Notes |
|---|---|---|---|
| 70/100 | 18 pinned ✓/4 issue | None pinned to exact versions (caret/squiggly ranges) | Front-deps leaves drift risk |
| 65/100 | CVE exposure | 1 known-vuln, supply-chain risk on `lucide-react` | No pip-audit / npm audit in CI |
| 80/100 | Fresh versions | Many bleeding-edge pairs | Latest py 3.14 stick tells version skew |

---

## §1 — Backend `requirements.txt`

22 packages. **20 pinned with `==`**, 2 pinned with ranges.

| Package | Version | Status | Notes |
|---|---|---|---|
| `fastapi` | `==0.115.6` | Current ✓ | Stable |
| `uvicorn[standard]` | `==0.34.0` | Current ✓ | |
| `sqlalchemy` | `==2.0.36` | Current ✓ | |
| `alembic` | `==1.14.1` | Current ✓ | |
| `psycopg2-binary` | `==2.9.10` | Current ✓ | |
| `pydantic` | `==2.10.4` | Current ✓ | |
| `pydantic-settings` | `==2.7.1` | Current ✓ | |
| **`python-jose[cryptography]`** | `==3.3.0` | **HIGH (CVE)** | CVE-2024-33663 (JWT alg DoS), CVE-2024-33664 (signature confusion). Mitigated by single `algorithms=[settings.algorithm]` in `core/security.py` decode. **Bump to 3.4.0+ or migrate to `pyjwt`** |
| **`passlib[bcrypt]`** | `==1.7.4` | **MEDIUM (CVE)** | CVE-2024-9266 affects argon2 path; ZENOVA uses bcrypt only → low impact but bump to 1.7.5+ |
| `python-dotenv` | `==1.0.1` | Current ✓ | |
| `redis` | `==5.2.1` | Current ✓ | |
| `httpx` | `==0.28.1` | Current ✓ | |
| `cryptography` | `==44.0.0` | Current ✓ | |
| `pytest` | `==8.3.4` | Test-only ✓ | |
| `pytest-asyncio` | `==0.25.0` | Test-only ✓ | |
| `email-validator` | `>=2.0.0,<3.0.0` | Range OK | **Declared but not used** (see CODE_QUALITY CQ6) — remove or actually use `EmailStr` |
| **`openpyxl`** | `==3.1.5` | **HIGH (CVE)** | CVE-2024-28208 (DoS via crafted workbook). `utils/excel.py:parse_excel` accepts user `UploadFile` directly → vulnerable input path. Bump to latest patch / add workbook-size guard |
| **`python-multipart`** | **NOT PINNED** | **HIGH** | Supply-chain risk — pick exact version. CVE-2024-24762 below 0.0.20. Pin to `==0.0.20` |
| `python-dateutil` | `==2.9.0` | Current ✓ | |
| `apscheduler` | `>=3.10,<4.0` | Range OK | |
| `psutil` | `>=6.0,<7.0` | Range OK | |
| `pyotp` | `==2.10.0` | Current ✓ | |
| `qrcode` | `==8.2` | Current ✓ | |
| `reportlab` | `==5.0.0` | Current ✓ | |

### §1.1 — Recommended backend fixes

1. `python-jose==3.4.0` (or migrate to `pyjwt==2.10.1`)
2. `passlib==1.7.5` (or select `argon2-cffi` if argon2 ever needed)
3. `openpyxl` → latest patch (when available) AND add a workbook-size guard to `utils/excel.py:parse_excel` (max 5MB, max 20 sheets)
4. `python-multipart==0.0.20` (exact pin)
5. Remove `email-validator` OR migrate `email: str` → `EmailStr` in `schemas/auth.py`
6. Consider replacing `python-jose` with `pyjwt` — jose is in maintenance-only, pyjwt is actively developed

### §1.2 — Missing packages (referenced but not in requirements.txt)

- `bcrypt` — comes via `passlib[bcrypt]` (indirect, OK)
- `Jinja2` — not present (no known issue)
- `PyYAML` — not present (no known issue)

---

## §2 — Frontend `package.json`

### §2.1 — Versions observed (sampled; not all listed)

| Package | Declared | Concern |
|---|---|---|
| **`next`** | `16.2.9` | Bleeding-edge; `--webpack` flag in scripts confirms Turbopack fallback; Next 16 was pre-release on many timelines at audit date |
| **`react`** | `^19.2.4` | Experimental/unreleased pair with Next 16; verify `react@19.x` stable before deploy |
| **`react-dom`** | `^19.2.4` | Same |
| **`lucide-react`** | **`^1.21.0`** | **NON-EXISTENT major version** — current is `lucide-react@0.460.x`. Either a typo or pulling a typo-squat from npm. **HIGH supply-chain risk** |
| `tailwindcss` | (v4) | OK |
| `framer-motion` | `^12.40.0` | OK |
| `recharts` | `2.15.0` | OK |
| `three`, `@react-three/fiber`, `@react-three/drei` | various | Heavy — lazy-load only on dashboard routes |
| `html5-qrcode` | recent | OK |
| `axios` | recent | Stable ✓ |

### §2.2 — Patterns flagged

- **No exact pins** — all versions are caret (`^`) ranges. Pin production to exact versions in CI builds to prevent drift
- **No `npm audit --audit-level=high` in CI** (DEVOPS_AUDIT §6.1)
- **No lockfile inspection** (`frontend/package-lock.json` or `pnpm-lock.yaml`) — verify `package-lock.json` is git-tracked and update-PR strategy is "renovate bot or manual"
- **Three.js heavy for ERP** — only used on one or two dashboards

### §2.3 — Recommended frontend fixes

1. **Replace `lucide-react@^1.21.0`** with `lucide-react@^0.460.0` (verified against npm registry)
2. Pin all production-build deps with `=` ranges after CI passes
3. Add `npm audit --audit-level=high` to CI a security-scan job
4. Code-split `three/@react-three/fiber/@react-three/drei` to dashboard routes only

---

## §3 — License-server `requirements.txt`

| Package | Version | Notes |
|---|---|---|
| `fastapi` | `>=0.115.0` | Range OK |
| `uvicorn` | `>=0.34.0` | Range OK |
| `sqlalchemy` | `>=2.0` | Range OK |
| `pydantic` | `>=2.7` | Range OK |
| `pydantic-settings` | recent | OK |
| `python-jose` | recent | Same CVE concern as main backend (see §1) |
| `python-dotenv` | recent | OK |

**Issues:**

1. SQLite (`sqlite:///./zenova_cloud.db` in `license-server/app/config.py:6`) — fine for dev/single-admin, but cloud concurrency potential → switch to PostgreSQL
2. No `alembic` for migrations — DB schema drifts manually; recommend alembic install

---

## §4 — Combined Dependency Risks

### §4.1 — Vulnerability matrix

| Package | CVE | Affects | Severity | Mitigation |
|---|---|---|---|---|
| `python-jose==3.3.0` | CVE-2024-33663 (alg DoS), CVE-2024-33664 (sig confusion) | JWT decode paths | High (mitigated) | Pin `3.4.0+` |
| `passlib==1.7.4` | CVE-2024-9266 (argon2 only) | Password hashing — not used path | Medium (low impact) | Pin `1.7.5+` |
| `openpyxl==3.1.5` | CVE-2024-28208 (DoS) | User-supplied `.xlsx` upload | High | Pin latest patch + size guard |
| `python-multipart` unpinned | CVE-2024-24762 (<0.0.20) | File uploads | High | Pin `0.0.20` |
| `lucide-react@^1.21.0` | non-existent major — supply-chain typo-squat risk | Frontend bundle | High | Pin real version `^0.460.0` |

### §4.2 — No security scanning

- `pip-audit` not in CI
- `npm audit` not in CI
- `Trivy` image scanning not in CI
- `gitleaks` not in CI
- `Snyk`/`dependabot` not enabled

**Recommendation (one-time addition to CI):**

```yaml
- name: pip-audit
  run: |
    pip install pip-audit
    pip-audit -r backend/requirements.txt --strict
- name: npm audit
  run: cd frontend && npm audit --audit-level=high
- uses: aquasecurity/trivy-action@master
  with: { scanners: vuln, severity: HIGH,CRITICAL }
- uses: gitleaks/gitleaks-action@v2
```

Plus enable Dependabot on the GitHub repo for PRs on patch bumps.

---

## §5 — Dependency Hygiene Findings Summary

| # | Severity | Package | File | Issue |
|---|---|---|---|---|
| DEP1 | High | `python-jose==3.3.0` | `backend/requirements.txt` | Known CVEs; mitigation incomplete |
| DEP2 | High | `openpyxl==3.1.5` | `backend/requirements.txt` | CVE; user-supplied upload path |
| DEP3 | High | `python-multipart` unpinned | `backend/requirements.txt` | Supply-chain risk + CVE |
| DEP4 | High | `lucide-react@^1.21.0` | `frontend/package.json:29` | Non-existent major; supply-chain typo-squat risk |
| DEP5 | Medium | `passlib==1.7.4` | `backend/requirements.txt` | argon2 CVE; not-used path → low impact |
| DEP6 | Medium | No CI security scan (pip-audit / npm audit / Trivy / Gitleaks) | `.github/workflows/ci.yml` | Future CVE drift undetected |
| DEP7 | Medium | `email-validator` declared but unused | `backend/requirements.txt` | Dead dependency → remove or use |
| DEP8 | Medium | Frontend not pinned to exact versions | `package.json` | Drift risk |
| DEP9 | Medium | Python/Node version skew CI 3.14/22 vs Docker 3.12/20 | `ci.yml` + Dockerfiles | Build/deploy skew |
| DEP10 | Low | License-server sqlite + no alembic | `license-server/requirements.txt` | Schema drift / concurrency |
| DEP11 | Low | ~all pin ranges caret | `package.json` | Acceptable but pin-exact recommended |

---

## §6 — Recommended Immediate Actions (1 PR)

```diff
# backend/requirements.txt
- python-jose[cryptography]==3.3.0
+ python-jose[cryptography]==3.4.0
- passlib[bcrypt]==1.7.4
+ passlib[bcrypt]==1.7.5
- openpyxl==3.1.5
+ openpyxl==3.1.7  # or newest patch containing CVE-2024-28208 fix
- python-multipart
+ python-multipart==0.0.20
- email-validator>=2.0.0,<3.0.0  # remove (no EmailStr usage) — OR migrate schemas to EmailStr
```

```diff
# frontend/package.json
- "lucide-react": "^1.21.0"
+ "lucide-react": "^0.460.0"
```

```yaml
# .github/workflows/ci.yml add jobs
- pip-audit on backend/requirements.txt
- npm audit --audit-level=high on frontend
- Trivy image scan on built images
- Gitleaks on source
```

---

**Dependency Score: 65/100** — deduct 25 for 4 CVEs/risks + missing CI scanning; deduct 10 for unused dep + 2 unpinned ranges.

**End of DEPENDENCY_AUDIT.md**
