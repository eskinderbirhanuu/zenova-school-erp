# Docker Protection

## Overview

Docker images are the primary distribution mechanism for ZENOVA. Protecting Docker images prevents unauthorized access to source code, configuration, and intellectual property. The current setup ships raw Python source files — this must be hardened.

## Current State Analysis

### What Exists
| Asset | Status | Issue |
|-------|--------|-------|
| `backend/Dockerfile` | ✅ Single-stage | Includes full source code |
| `frontend/Dockerfile` | ✅ Multi-stage | Build artifacts only |
| `docker-compose.yml` | ✅ 4 services | Ignores security hardening |
| `nginx.conf` | ✅ Nginx config | Good baseline |
| K8s manifests | ✅ 9 files | Ingress with TLS |
| `.dockerignore` | ✅ Basic | Missing git removal |

### What Ships in the Image
```
backend Docker image includes:
  ├── app/                  ← ALL Python source code
  ├── requirements.txt      ← Full dependency list
  ├── alembic/              ← Migration history
  ├── alembic.ini
  ├── docker-entrypoint.sh
  ├── .dockerignore
  └── .env.example          ← Configuration template
```

**This is a piracy risk.** Anyone with Docker access can copy the entire application source.

## Protection Layers

### Layer 1 — Remove Git Repository

**Problem:** `.git` is excluded by `.dockerignore` but other VCS artifacts may remain.

**Solution:**
```dockerignore
# Add to backend/.dockerignore
.git
.gitignore
.gitattributes
.gitmodules
*.md
docs/
scripts/
tests/
*.sql
*.csv
*.xlsx
.env
.env.example
docker-compose*.yml
k8s/
nginx/
```

### Layer 2 — Multi-Stage Build for Backend

**Current:** Single-stage, ships full source
**Target:** Multi-stage, ships compiled artifacts only

```dockerfile
# Stage 1: Build
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python -m nuitka --standalone --onefile --enable-plugin=multiprocessing \
    --output-dir=/dist app.main:app

# Stage 2: Runtime
FROM python:3.12-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev && rm -rf /var/lib/apt/lists/*
COPY --from=builder /dist/app.main.bin /app/zenova
COPY --from=builder /app/alembic /app/alembic
COPY --from=builder /app/alembic.ini /app/alembic.ini
COPY docker-entrypoint.sh /app/
EXPOSE 8000
ENTRYPOINT ["/app/zenova"]
```

**Alternative (if Nuitka fails):**
```dockerfile
# PyInstaller single-file build
RUN pyinstaller --onefile --name zenova app/main.py
```

### Layer 3 — Distroless Base Images

**Why:** Minimal attack surface, no shell, no package manager, no Python interpreter.

```dockerfile
FROM gcr.io/distroless/python3-debian12:nonroot AS runtime
COPY --from=builder /app/dist/zenova /app/zenova
COPY --from=builder /app/alembic /app/alembic
EXPOSE 8000
ENTRYPOINT ["/app/zenova"]
```

### Layer 4 — Non-Root User

**Current:** Containers run as root (PID 1).

**Fix:**
```dockerfile
# In backend Dockerfile
RUN useradd -m -u 1001 zenova
USER zenova

# In frontend Dockerfile (already has nextjs user)
USER nextjs

# In docker-compose.yml
services:
  backend:
    user: "1001:1001"
```

### Layer 5 — Image Signing (Docker Content Trust)

```
export DOCKER_CONTENT_TRUST=1
docker push zenova/backend:latest   # Automatically signed
```

**Verification at deploy:**
```bash
# Before pulling, verify signature
docker trust inspect zenova/backend:latest --pretty
```

### Layer 6 — Read-Only Root Filesystem

```yaml
# docker-compose.yml
services:
  backend:
    read_only: true
    tmpfs:
      - /tmp
      - /app/data  # Only writable path
```

### Layer 7 — Vulnerability Scanning (CI)

```yaml
# .github/workflows/security.yml
- name: Scan Docker image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: 'zenova/backend:${{ github.sha }}'
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
```

## Implementation Plan

### Phase 1 (2 days)
1. Update `.dockerignore` files to exclude sensitive content
2. Switch backend to multi-stage build (at minimum separate build + runtime stages)
3. Run containers as non-root user

### Phase 2 (3 days)
4. Add distroless base image variant
5. Configure Docker Content Trust for image signing
6. Add read-only root filesystem

### Phase 3 (2 days)
7. Integrate Trivy scanning into CI/CD
8. Add image layer audit to deployment pipeline
9. Remove all `.py` source files from final image (compile first)

## Docker Compose Security Hardening

```yaml
version: '3.8'

x-security: &security
  read_only: true
  security_opt:
    - no-new-privileges:true
  cap_drop:
    - ALL
  cap_add:
    - NET_BIND_SERVICE  # Only for port binding

services:
  backend:
    <<: *security
    image: zenova/backend:${BUILD_ID:-latest}
    user: "1001:1001"
    tmpfs:
      - /tmp
      - /app/data
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
```

## Risk Assessment

| Risk | Before | After |
|------|--------|-------|
| Source code theft from image | ✅ Raw .py files | ❌ Compiled binary |
| Container breakout | ✅ Root user | ❌ Non-root + no-new-privs |
| Image tampering | ✅ No signing | ❌ Docker Content Trust |
| Known vulnerabilities | ✅ No scanning | ❌ Trivy in CI |
| Supply chain attack | ✅ No verification | ❌ Signed images verified |
| Configuration leakage | ✅ .env in .dockerignore | ❌ No .env.example in image |

## Rollback

- Revert to single-stage: `docker compose build --no-cache backend`
- Remove distroless: Switch back to `python:3.12-slim`
- Disable signing: `export DOCKER_CONTENT_TRUST=0`
