# Monitoring — ZENOVA ERP

## Health Endpoints

All under `/api/v1/health`:

| Endpoint | Purpose | Frequency |
|---|---|---|
| `GET /health` | Full health report (DB, Redis, system, sync, backup) | Every 30s |
| `GET /health/live` | Liveness probe (always 200) | Every 10s |
| `GET /health/ready` | Readiness probe (DB check) | Every 10s |

## Metrics

`GET /api/v1/metrics` — Prometheus-style:

- Request count (total, by method, by path, by status)
- Average latency
- Uptime in seconds

## Docker Healthchecks

Built into `docker-compose.yml`:

| Service | Check | Interval | Start Period |
|---|---|---|---|
| db | `pg_isready` | 10s | 30s |
| redis | `redis-cli ping` | 10s | — |
| backend | `curl /health/live` | 30s | 60s |

## Resource Limits

| Service | Default Memory | Default CPU |
|---|---|---|
| db | 512M | 1.0 |
| redis | 256M | 0.5 |
| backend | 1024M | 2.0 |
| frontend | 512M | 1.0 |

Configurable via `.env`:
```
DB_MEM_LIMIT=512M
BACKEND_MEM_LIMIT=1024M
BACKEND_CPU_LIMIT=2.0
```

## Alerting Thresholds

Check `AGENTS.md` for current thresholds. Key values:

- DB latency > 500ms
- Disk usage > 85%
- RAM usage > 90%
- API latency > 2s
- Pending sync count > 1000

## Logging

- Dev: human-readable, stdout
- Prod: JSON-structured (machine-parseable)
- Log level: `INFO` (set via `ENVIRONMENT`)
- All `print()` replaced with `logging.getLogger(__name__)`
