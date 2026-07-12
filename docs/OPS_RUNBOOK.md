# Operator / SRE Runbook

## Service Overview

| Service | Port | Health Check | Dependencies |
|---------|------|-------------|--------------|
| Backend API | 8000 | `GET /health` | PostgreSQL, Redis |
| Frontend | 3000 | `GET /` | Backend API |
| License Server | 8001 | `GET /health` | PostgreSQL (prod) |
| Sync Worker | — | `GET /health` (backend) | Backend + Redis |
| PostgreSQL | 5432 | `pg_isready` | — |
| Redis | 6379 | `redis-cli ping` | — |

## Health Endpoints

```bash
# Full health check (DB + Redis + disk + sync + backup)
curl http://localhost:8000/health

# Liveness probe (is process alive?)
curl http://localhost:8000/live

# Readiness probe (can serve traffic?)
curl http://localhost:8000/ready

# Prometheus metrics
curl http://localhost:8000/api/v1/metrics
```

## Monitoring (Prometheus)

The `/api/v1/metrics` endpoint exposes:

| Metric | Type | Description |
|--------|------|-------------|
| `zenova_requests_total` | Counter | Requests by method, path, status |
| `zenova_request_latency_seconds` | Histogram | Latency buckets (5ms–10s) |
| `zenova_active_requests` | Gauge | Currently inflight requests |
| `zenova_db_up` | Gauge | 1 if DB reachable, 0 if down |
| `zenova_redis_up` | Gauge | 1 if Redis reachable, 0 if down |
| `zenova_sync_pending` | Gauge | Pending sync queue items |
| `zenova_users_total` | Gauge | Total registered users |

**Suggested Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: zenova
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ['backend:8000']
```

## Deployment

### Prerequisites
- Docker 24+ and Docker Compose
- Domain with DNS pointing to server (ports 80/443)
- SSL certs (Certbot or similar)

### First-Time Deploy
```bash
git clone https://github.com/your-org/zenova.git
cd zenova/deploy
cp secrets.example.env secrets.env
# EDIT secrets.env: fill DB_PASSWORD, SECRET_KEY, MASTER_SETUP_KEY
docker compose -f docker-compose.vps.yml up -d
```

### Update
```bash
cd zenova
git pull
docker compose -f deploy/docker-compose.vps.yml build
docker compose -f deploy/docker-compose.vps.yml up -d
```

### Rollback
```bash
# Revert to previous git tag, then rebuild
git checkout v0.9.4
docker compose -f deploy/docker-compose.vps.yml build
docker compose -f deploy/docker-compose.vps.yml up -d
```

## Database Operations

### Backup (automated daily)
Backups go to `deploy/backups/` as SQL dumps, retained 7 days.

### Manual backup
```bash
docker exec $(docker ps -q -f name=db) pg_dump -U zenova zenova_prod > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
docker exec -i $(docker ps -q -f name=db) psql -U zenova zenova_prod < backup_20260712.sql
```

### Run migrations
```bash
docker exec $(docker ps -q -f name=backend) alembic upgrade head
```

## Common Incidents

### Service down
```bash
# Check all containers
docker ps -a
# Check logs
docker compose logs --tail=100 backend
docker compose logs --tail=100 db
# Restart
docker compose restart backend
```

### Database connection errors
```bash
# Verify DB is up
docker exec $(docker ps -q -f name=db) pg_isready -U zenova
# Check connection count
docker exec $(docker ps -q -f name=db) psql -U zenova -c "SELECT count(*) FROM pg_stat_activity;"
```

### High memory / CPU
```bash
# Per-container stats
docker stats
# Check slow queries
docker exec $(docker ps -q -f name=db) psql -U zenova -c \
  "SELECT query, state, wait_event FROM pg_stat_activity ORDER BY state;"
```

### Redis down
- Auth tokens cannot be refreshed (users see 401)
- Rate limiting disabled
- Fix: `docker compose restart redis`

### License validation failing
```bash
# Check license server
curl http://license-server:8001/health
# Re-sync license
curl -X POST http://backend:8000/api/v1/licenses/verify -H "Authorization: Bearer $TOKEN"
```

### Backup disk full
```bash
# Check disk
df -h
# Prune old backups manually
find deploy/backups -name "*.sql" -mtime +14 -delete
# Add more disk or reduce retention
```

## SSL Certificate Renewal

Certbot auto-renew is configured. To force renewal:
```bash
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

## Logs

### View backend logs
```bash
docker compose logs --tail=500 -f backend
```

### View nginx access logs
```bash
docker compose logs --tail=100 nginx
```

### Structured logging format
Backend logs JSON lines:
```
{"timestamp":"...", "level":"INFO", "request_id":"...", "path":"/api/...", "method":"GET", "status":200, "duration_ms":42}
```

## Alerting Thresholds

| Signal | Warning | Critical | Action |
|--------|---------|----------|--------|
| DB latency | > 100ms | > 500ms | Check queries, connection pool |
| Redis reachable | — | Down | `docker compose restart redis` |
| Disk usage | > 80% | > 90% | Prune backups, resize disk |
| CPU | > 70% for 5min | > 90% | Check for slow queries, scale up |
| Pending sync | > 1000 | > 10000 | Investigate sync worker |
| 5xx rate | > 1% | > 5% | Check logs, rollback if needed |

## Useful Commands

```bash
# Enter backend container
docker exec -it $(docker ps -q -f name=backend) /bin/bash

# Run Python one-liner
docker exec $(docker ps -q -f name=backend) python -c "from app.database import SessionLocal; db=SessionLocal(); print(db.execute('SELECT count(*) FROM users').scalar())"

# Flush Redis cache
docker exec $(docker ps -q -f name=redis) redis-cli FLUSHALL

# Check migration history
docker exec $(docker ps -q -f name=backend) alembic history

# View current migration
docker exec $(docker ps -q -f name=backend) alembic current
```
