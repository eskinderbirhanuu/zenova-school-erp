# ZENOVA School ERP — Customer Package

## What You Get

- **Pre-built Docker images** (backend + frontend) — no source code
- **`docker-compose.yml`** — one-command deployment
- **Nginx config** — reverse proxy with WebSocket support
- **Setup Wizard** — browser-based `.env` configuration

## Requirements

- Ubuntu 22.04+ or Windows Server 2019+ (with Docker Desktop)
- Docker Engine 24+ and Docker Compose v2
- 4 GB RAM minimum, 8 GB recommended
- 20 GB free disk space
- A valid ZENOVA license key

## Installation

```bash
# 1. Extract the package
tar -xzf zenova-1.0.0.tar.gz
cd zenova-1.0.0

# 2. Load Docker images
docker load < zenova-backend-1.0.0.tar.gz
docker load < zenova-frontend-1.0.0.tar.gz

# 3. Configure (use setup wizard or manual .env)
#    Option A: Setup Wizard
php -S 0.0.0.0:8080 -t setup-wizard
#    Open http://localhost:8080 in your browser

#    Option B: Manual
cp .env.example .env
# Edit .env with your license key and passwords

# 4. Start the system
docker compose up -d

# 5. Verify
curl http://localhost:80/api/v1/health/live
```

## Default Access

- URL: `http://localhost`
- Setup Wizard: `http://localhost:8080`
- API: `http://localhost:8000/api/v1`

After initial setup, create the admin account via the web interface.

## Updating

```bash
# Download the update package
# Then:
docker compose down
docker load < zenova-backend-1.1.0.tar.gz
docker load < zenova-frontend-1.1.0.tar.gz
docker compose up -d
```

## Support

Contact your ZENOVA provider for license renewal and support.
