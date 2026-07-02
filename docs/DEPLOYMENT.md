# Deployment

## Architecture

Docker Compose stack running on Ubuntu Server 22.04/24.04 LTS inside school network. Fully offline-capable.

## Server Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 cores | 4 cores |
| Disk | 20 GB | 50 GB |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Network | Static IP (DHCP reservation) | Static IP |

## Docker Compose Setup

### Services
- **PostgreSQL 16** — Primary database (localhost only)
- **Redis 7** — Cache + session store (localhost only)
- **Backend** — FastAPI (internal only)
- **Frontend** — Next.js 16 (internal only)
- **Nginx** — Reverse proxy on port 80 (all interfaces)

### docker-compose.yml
Root `docker-compose.yml` orchestrates all services. Backend uses `read_only: true` filesystem for security. Environment variables via `.env` file.

### Dockerfiles
- **Backend**: Multi-stage build (python:3.12-slim), non-root user (`zenova`)
- **Frontend**: Multi-stage build (node:22-alpine), non-root user (`nextjs`)

### Nginx Config
Routes `/` → frontend:3000, `/api/` → backend:8000.

## Ubuntu Deployment

1. Install Docker + Docker Compose plugin
2. Configure static IP via netplan
3. Clone repository to `/opt/zenova`
4. Run `scripts/deploy.sh` — generates secrets, builds images, starts services
5. Enable systemd service for auto-start on boot

### deploy.sh
```bash
# Generates .env with SECRET_KEY, DB_PASS, SERVER_IP
# Runs: docker compose up -d --build
# Runs: docker compose exec backend alembic upgrade head
```

## PWA (Progressive Web App)

Manifest, service worker, and install prompt components exist but are **not fully functional**. Service worker has network-first API caching and offline attendance sync plumbing.

## Implementation Order

| Phase | Tasks |
|-------|-------|
| Phase 1: PWA | manifest.json, sw.js, register component, install prompt |
| Phase 2: Docker | Frontend Dockerfile, docker-compose, nginx, .dockerignore |
| Phase 3: Ubuntu Deploy | deploy.sh, systemd service, static IP |
| Phase 4: License Crypto | RSA keys, fingerprinting, .lic files |
| Phase 5: Watermark System | watermark.py, honeytokens, 8 embed locations |
| Phase 6: Feature Lock | require_licensed_feature dependency, frontend checks |
| Phase 7: Distribution | Docker image build pipeline, .lic gen, docs |

## CI/CD

Not yet configured. Planned: GitHub Actions for automated build and test.

## Monitoring

Basic health check endpoint exists. Prometheus + Grafana planned but not implemented.

## Backup

No automated backup automation. Manual pg_dump recommended for now.
