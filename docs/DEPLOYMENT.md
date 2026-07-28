# Deployment

Two deployment paths: **VPS** (internet-connected, HTTPS with Let's Encrypt) and **On-prem** (school LAN, offline/air-gapped). Both use Docker Compose.

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 cores | 4 cores |
| Disk | 20 GB | 50 GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Docker | 24+ with Compose plugin | Latest |
| Network | Static IP (DHCP reservation) | Static IP |

## Docker Stack

Six services orchestrated by Docker Compose:

| Service | Image | Role |
|---------|-------|------|
| `nginx` | nginx:1.26-alpine | Reverse proxy (port 80/443), TLS termination, rate limiting |
| `db` | postgres:16-alpine | Primary database, automated pg_dump backups |
| `redis` | redis:7-alpine | Cache, session store, rate limiter, sync queue |
| `backend` | zenova/backend | FastAPI application server (health-checked) |
| `frontend` | zenova/frontend | Next.js 16 server (health-checked) |
| `sync-worker` | zenova/backend | Async sync queue processor |
| `backup-worker` | postgres:16-alpine | Scheduled daily pg_dump to `/backups` (7-day retention) |
| `certbot` | certbot/certbot | SSL renewal (profile: `ssl`, checked every 12h) |

## Quick Start

### 1. First-time Server Setup

Run once on a fresh Ubuntu server:

```bash
# As root
sudo bash deploy/setup-ubuntu.sh
```

What this does:
- Updates system packages
- Installs Docker + Docker Compose plugin + PHP CLI
- Creates `zenova` user, adds to `docker` group
- Creates `/home/zenova/zenova/` directory
- Copies deployment files (compose, nginx config, SSL)
- Loads pre-built Docker images from `zenova-backend-*.tar.gz` / `zenova-frontend-*.tar.gz`
- Installs systemd service for auto-start on boot
- Configures UFW firewall (SSH, HTTP, HTTPS)
- Optionally sets static IP via netplan

### 2. Environment Configuration

```bash
# VPS (internet-connected)
cp deploy/.env.vps.example deploy/.env.vps
# Edit: DOMAIN, DB_PASSWORD, REDIS_PASSWORD, SECRET_KEY
nano deploy/.env.vps

# On-prem (air-gapped, school LAN)
cp deploy/.env.vps.example deploy/.env.vps
# Edit: SERVER_IP instead of DOMAIN, same secrets
nano deploy/.env.vps
```

**Required variables:**
| Variable | Purpose | Example |
|----------|---------|---------|
| `DOMAIN` | Server domain or IP | `school.zenova.et` or `192.168.1.100` |
| `DB_PASSWORD` | PostgreSQL password (32+ chars) | Random string |
| `REDIS_PASSWORD` | Redis password (32+ chars) | Random string |
| `SECRET_KEY` | JWT signing key (64+ chars) | Random string |
| `ZENOVA_LICENSE_KEY` | License key (fill after purchase) | `ZNV-A1B2-C3D4-E5F6-ABCD` |
| `ZENOVA_LICENSE_SERVER` | License validation server | `https://superadmin.free.nf` |
| `SCHOOL_ID` | School ID (from control center) | UUID |

### 3. Deploy

```bash
# Deploy School ERP
./deploy/deploy.sh school

# Deploy Control Center (admin only — private)
./deploy/deploy.sh cc
```

`deploy.sh` automates:
1. Loads `.env.vps` or `.env.cc`
2. Generates self-signed SSL cert (replace with Let's Encrypt later)
3. Loads pre-built Docker images
4. Runs `docker compose up -d`
5. Waits for database readiness
6. Runs Alembic migrations (`alembic upgrade head`)

### 4. SSL Certificate (VPS only)

```bash
# Replace self-signed cert with Let's Encrypt
docker compose --profile ssl run certbot certonly \
  --webroot -w /var/www/certbot \
  -d your-domain.com

# Nginx auto-picks up the new cert; no restart needed
```

## License Activation

After deployment, open the setup wizard:

```
http://<server-ip>/setup-wizard/
```

Flow:
1. Enter Main License Key → system validates against license server
2. Create school profile (name, code, logo)
3. Create admin account
4. (Optional) Enter Branch License Key for multi-branch
5. Setup Wizard guides through: academic year → classes → sections → subjects → teachers
6. System unlocked — login at `http://<server-ip>/login`

Internet is required for first activation (license server validation). After activation, the system runs fully offline with a 45-day grace period.

## Health Check

```bash
# Full system health
curl http://localhost:8000/api/v1/health/

# Docker service status
docker compose ps

# Individual service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f nginx
docker compose logs -f db
```

**Health endpoint response:**
```json
{
  "status": "ok",
  "service": "zenova-erp",
  "checks": {
    "database": {"status": "operational", "latency_ms": 2.3},
    "redis": {"status": "operational"},
    "server_identity": {"status": "operational"},
    "system": {"disk": {...}, "cpu": {...}, "ram": {...}},
    "sync": {"pending": 0, "last_synced_at": "..."},
    "backup": {"total_backups": 7, "last_backup_at": "..."},
    "api": {"status": "operational"},
    "uptime": {"seconds": 86400, "hours": 24.0}
  }
}
```

## Update Process

```bash
# 1. Backup database
docker compose exec db pg_dump -U zenova zenova_prod --no-owner --no-acl \
  -f /backups/pre_update_$(date +%Y%m%d_%H%M%S).sql

# 2. Load new images
docker load < zenova-backend-2.0.0.tar.gz
docker load < zenova-frontend-2.0.0.tar.gz

# 3. Update compose file and .env as needed
# 4. Restart with new images
docker compose up -d

# 5. Run migrations
docker compose exec backend alembic upgrade head

# 6. Health check
curl http://localhost:8000/api/v1/health/
```

**Per-school update procedure:**
1. Download update package (`zenova-<version>.zip`)
2. Backup database
3. Install update (load images, replace compose/env files)
4. Run database migrations (`alembic upgrade head`)
5. Health check (login, attendance, payments, reports, notifications, dashboard, API, database)
6. Restart services if needed
7. Done

## Rollback

```bash
# 1. Downgrade database
docker compose exec backend alembic downgrade -1

# 2. Restore backup
docker compose exec -T db psql -U zenova zenova_prod \
  < /backups/pre_update_*.sql

# 3. Revert to previous images
docker load < zenova-backend-<previous-version>.tar.gz
docker load < zenova-frontend-<previous-version>.tar.gz

# 4. Restart
docker compose up -d
```

## Monitoring

### Logs

```bash
# Follow all services
docker compose logs -f

# Last 100 lines, backend only
docker compose logs --tail=100 backend

# Search for errors
docker compose logs backend | grep -i error

# Export logs for debugging
docker compose logs > debug_logs.txt
```

### Health Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/v1/health/` | Full health: DB, Redis, disk, CPU, RAM, sync, backup, uptime |
| `/api/v1/health/live` | Liveness probe (always 200) |
| `/api/v1/health/ready` | Readiness probe (200 when DB reachable, 503 otherwise) |

### Docker Healthchecks

Every service has a built-in healthcheck (30s interval, 3 retries). Status visible via:

```bash
docker compose ps
```

## Auto-start (systemd)

Installed by `setup-ubuntu.sh` at `/etc/systemd/system/zenova.service`:

```ini
[Unit]
Description=ZENOVA ERP — School Management System
Requires=docker.service
After=docker.service network.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/zenova
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose pull && /usr/bin/docker compose up -d
TimeoutStartSec=120

[Install]
WantedBy=multi-user.target
```

**Commands:**
```bash
sudo systemctl start zenova
sudo systemctl stop zenova
sudo systemctl restart zenova
sudo systemctl status zenova
```

## Backup & Restore

### Automated (built-in)

The `backup-worker` container runs `pg_dump` daily at 3:00 AM, saves to `./backups/`, and deletes files older than 7 days.

### Manual

```bash
# Create backup via API
curl -X POST http://localhost:8000/api/v1/backups -H "Cookie: access_token=..."

# Download backup
curl http://localhost:8000/api/v1/backups/zenova_20260728_030000.sql/download \
  -o backup.sql -H "Cookie: access_token=..."

# Direct pg_dump
docker compose exec -T db pg_dump -U zenova zenova_prod > backup.sql

# Restore
cat backup.sql | docker compose exec -T db psql -U zenova zenova_prod
```

### Cloud Backup (optional)

Configure in `.env.vps`:
```
BACKUP_ENCRYPT_ENABLED=true
BACKUP_ENCRYPTION_KEY=...
BACKUP_CLOUD_URL=s3://your-bucket
BACKUP_CLOUD_ACCESS_KEY=...
BACKUP_CLOUD_SECRET_KEY=...
```

## Network Architecture

```
Internet / School LAN
    │
    ▼
┌─────────┐   port 80/443
│  Nginx   │◄─────────────────
│ (public) │
└────┬─────┘
     │
     ├──► /api/v1/*  ───► backend:8000
     │
     ├──► /ws        ───► backend:8000 (WebSocket)
     │
     └──► /*         ───► frontend:3000
```

## Control Center (Private)

Deployed on a separate private VPS for ZENOVA administrators only. Manages:
- Customer schools (CRUD)
- License generation (RSA-signed `.lic` files)
- Update distribution
- Heartbeat monitoring
- Analytics dashboard

```bash
# Deploy Control Center
cp deploy/.env.cc.example deploy/.env.cc
# Edit CC_DOMAIN, CC_DB_PASSWORD, CC_SECRET_KEY, CC_ADMIN_EMAIL, CC_ADMIN_PASSWORD
./deploy/deploy.sh cc
```

## Nginx Configuration

Rate limiting: 30 requests/sec per IP on `/api/v1/`, burst 20. Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, XSS-Protection, CSP. Max body size: 50MB.

## Production Checklist

- [ ] Replace all default passwords in `.env.vps`
- [ ] Set up Let's Encrypt SSL (remove self-signed cert)
- [ ] Configure `DOMAIN` to real domain
- [ ] Run health check and verify all services green
- [ ] Test login with admin credentials
- [ ] Create a test student, mark attendance, record a payment
- [ ] Verify backup worker created first backup
- [ ] Enable UFW (done by `setup-ubuntu.sh`)
- [ ] Test systemd auto-start: `sudo reboot`
- [ ] Verify sync status shows 0 pending
