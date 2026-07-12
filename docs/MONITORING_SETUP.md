# Monitoring Setup

## Quick Start (Docker Compose)

Add these services to your `docker-compose.vps.yml`:

```yaml
prometheus:
  image: prom/prometheus:v3.2.0
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus-data:/prometheus
  ports:
    - "9090:9090"
  restart: unless-stopped

grafana:
  image: grafana/grafana:11.6.0
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
  volumes:
    - grafana-data:/var/lib/grafana
  ports:
    - "9091:3000"
  restart: unless-stopped
```

Create `deploy/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: zenova
    metrics_path: /api/v1/metrics
    static_configs:
      - targets: ['backend:8000']
```

## Grafana Dashboard

1. Open http://localhost:9091 (admin / password from env)
2. Add Prometheus data source: http://prometheus:9090
3. Import or create a dashboard with these panels:

### Key Panels

| Panel | Metric | Description |
|-------|--------|-------------|
| Request Rate | `rate(zenova_requests_total[5m])` | Requests per second |
| Error Rate | `rate(zenova_requests_total{status=~"5.."}[5m])` | 5xx per second |
| Latency P99 | `histogram_quantile(0.99, rate(zenova_request_latency_seconds_bucket[5m]))` | P99 latency |
| Active Requests | `zenova_active_requests` | Current concurrency |
| DB Status | `zenova_db_up` | 1 = healthy, 0 = down |
| Redis Status | `zenova_redis_up` | 1 = healthy, 0 = down |
| Sync Backlog | `zenova_sync_pending` | Pending sync items |

## Alertmanager

```yaml
# deploy/alertmanager.yml
route:
  receiver: slack
  routes:
    - match:
        severity: critical
      receiver: pagerduty
receivers:
  - name: slack
    slack_configs:
      - api_url: ${SLACK_WEBHOOK_URL}
        channel: "#zenova-alerts"
  - name: pagerduty
    pagerduty_configs:
      - routing_key: ${PAGERDUTY_KEY}
```

## Log Aggregation (Loki + Promtail)

```yaml
loki:
  image: grafana/loki:3.4.0
  ports:
    - "3100:3100"
  volumes:
    - loki-data:/loki

promtail:
  image: grafana/promtail:3.4.0
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
    - ./promtail.yml:/etc/promtail/config.yml
```

## Uptime Monitoring

The built-in `/live` and `/ready` endpoints serve as Kubernetes-style probes:

- `/live` — always returns 200 (process is alive)
- `/ready` — returns 200 if DB is reachable, 503 otherwise
- `/health` — full system health with all dependency checks
