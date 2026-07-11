# Deployment Guide

## Option 1: Docker Compose (Recommended for single-server)

### Prerequisites
- Docker Engine 24+ with Compose v2
- Domain + DNS (for production)

### Quick Start

```bash
# 1. Clone and configure
git clone <repo> zenova
cd zenova

# 2. Create .env with required secrets
cat > .env << 'EOF'
SECRET_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(48))")
MASTER_SETUP_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
ENVIRONMENT=production
EOF

# 3. Start all services
docker compose up --build -d

# 4. Run initial setup
# Visit http://localhost:3000 → installer wizard
# Or use the API:
curl -X POST http://localhost:8000/api/v1/setup/init \
  -H "Content-Type: application/json" \
  -d '{"master_key": "'$(grep MASTER_SETUP_KEY .env | cut -d= -f2)'"}'
```

### Production Checklist
- [ ] `SECRET_KEY` set to a 64-char random string
- [ ] `MASTER_SETUP_KEY` set to a 32-char random string
- [ ] `ENVIRONMENT=production`
- [ ] `COOKIE_SECURE=true`
- [ ] `ALLOWED_ORIGINS` set to your frontend domain
- [ ] `TRUSTED_NETWORKS` set to your office CIDR ranges
- [ ] TLS termination configured (reverse proxy or cloud LB)
- [ ] Database password changed from default `zenova_pass`
- [ ] Regular backups configured (see Backup section)
- [ ] Monitoring alerts set up on `/api/v1/health/live` + `/api/v1/health/ready`

### Health Checks

| Endpoint | Expected | Purpose |
|----------|----------|---------|
| `GET /api/v1/health/live` | 200 | Liveness probe |
| `GET /api/v1/health/ready` | 200 (or 503 during init) | Readiness probe |
| `GET /api/v1/health/` | 200 + DB latency | Full health |
| `GET /api/v1/metrics` | JSON | Request metrics |

### Backup

```bash
# Manual backup
curl -X POST http://localhost:8000/api/v1/backups \
  -H "Authorization: Bearer <token>"

# List backups
curl http://localhost:8000/api/v1/backups

# Download
curl http://localhost:8000/api/v1/backups/<filename>/download -O
```

Backups are retained automatically: hourly (last 24) → daily (last 30) → weekly (last 12).

### Archive Old Data

```bash
# Archive all eligible tables
curl -X POST http://localhost:8000/api/v1/archive/run \
  -H "Authorization: Bearer <token>"

# Archive specific table
curl -X POST "http://localhost:8000/api/v1/archive/run?table_name=attendance" \
  -H "Authorization: Bearer <token>"

# Check status
curl http://localhost:8000/api/v1/archive/status
```

Retention: attendance 2yr, notifications 6mo, audit_logs 1yr, sync_queue 90d.

## Option 2: Kubernetes

```bash
kubectl apply -k k8s/
```

Edit `k8s/secret.yaml` first to set `SECRET_KEY` and `MASTER_SETUP_KEY`.
Edit `k8s/ingress.yaml` to set your domain and TLS issuer.

## Load Testing

```bash
# With server running:
python backend/load_test.py --users 50 --concurrent 10
```

## Sync Stress Tests

```bash
python backend/sync_stress_test.py --base-url http://localhost:8000
```

## Database Migrations

Migrations run automatically on startup via the Docker entrypoint.
To run manually:

```bash
cd backend
alembic upgrade head
alembic current  # Verify head
```

Current head: `c5d6e7f8a0b1` (add_school_id_to_card_print_requests)
