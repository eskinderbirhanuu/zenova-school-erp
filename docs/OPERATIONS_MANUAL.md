# Operations Manual — ZENOVA ERP

## Startup

```bash
docker compose up --build -d
```

First-time setup:
1. Backend auto-runs `alembic upgrade head` via entrypoint.
2. Start sync worker: `docker compose exec backend python -m app.workers.sync_worker`
3. Verify: `curl http://localhost:8000/api/v1/health`

## Scheduled Jobs

| Job | Time | Component | Description |
|---|---|---|---|
| Archive | 2:00 AM daily | APScheduler (in-process) | Moves old records to archive per retention policy |
| Backup | 3:00 AM daily | APScheduler (in-process) | pg_dump + retention: hourly(24)→daily(30)→weekly(12) |

Jobs auto-start with the backend process. Check `docker compose logs backend | grep scheduler`.

## Backup Management

- **Location:** `backend/backups/` (persisted via `backend_data` volume)
- **List:** `docker compose exec backend ls -lh app/backups/`
- **Restore manually:**

```bash
docker compose exec -T db psql -U zenova_user zenova_db < app/backups/<file>.sql
```

## Key Commands

```bash
# Logs
docker compose logs -f backend

# Seed demo data
docker compose exec backend python scripts/seed_demo.py

# License check
docker compose exec backend python -c "from app.core.license_manager import verify_license; print(verify_license())"

# Redis flush (troubleshooting)
docker compose exec redis redis-cli FLUSHALL
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| 503 on health | DB not ready | `docker compose logs db` |
| 429 on requests | Rate limit hit | Wait 1 minute or check `API_RATE_LIMIT` in `.env` |
| `SECRET_KEY` error | Not set in `.env` | `echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env` |
| Sync worker not processing | Worker not started | `docker compose exec backend python -m app.workers.sync_worker &` |
| Alembic migration fails | Head mismatch | `docker compose exec backend alembic upgrade head` (auto-run on start) |
