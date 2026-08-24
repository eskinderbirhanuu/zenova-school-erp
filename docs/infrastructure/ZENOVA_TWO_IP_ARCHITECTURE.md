# ZENOVA Two-IP Architecture — Physical Server Deployment

**Status:** Design Phase — Awaiting Server Inspection  
**Target:** Single physical Ubuntu Server with dual IP addresses  
**Systems:** School ERP (IP A) + Organization/Demo (IP B)

---

## 1. Physical Server Specification

| Attribute | Value | Source |
|-----------|-------|--------|
| Hostname | `zenova-physical` (to verify) | `hostnamectl` |
| OS | Ubuntu 22.04/24.04 LTS (to verify) | `hostnamectl` |
| Primary IP | **192.168.1.6** | Current deployment |
| Secondary IP | **TBD** (192.168.1.XXX) | Netplan inspection |
| Interface | **TBD** (eno1/ens18/eth0) | `ip addr` |
| Gateway | **TBD** (likely 192.168.1.1) | `ip route` |
| Subnet | **192.168.1.0/24** (inferred) | CIDR from current IP |
| Network Manager | Netplan (to verify) | `/etc/netplan/` |

---

## 2. System Separation Architecture

### 2.1 Complete Logical Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHYSICAL UBUNTU SERVER                       │
│  ┌──────────────────────────────┐  ┌────────────────────────┐  │
│  │      IP A: 192.168.1.6       │  │   IP B: 192.168.1.XXX  │  │
│  │   ZENOVA SCHOOL ERP          │  │   ZENOVA ORG/DEMO      │  │
│  ├──────────────────────────────┤  ├────────────────────────┤  │
│  │ Nginx:  192.168.1.6:80/443  │  │ Nginx:  192.168.1.XXX  │  │
│  │ Backend: 127.0.0.1:8000     │  │ Backend: 127.0.0.1:8001 │  │
│  │ Frontend: 127.0.0.1:3000    │  │ Frontend: 127.0.0.1:3001│  │
│  │ PostgreSQL: 127.0.0.1:5432  │  │ PostgreSQL: 127.0.0.1:5433│  │
│  │ Redis: 127.0.0.1:6379       │  │ Redis: 127.0.0.1:6380   │  │
│  │ DB: zenova_prod             │  │ DB: zenova_org         │  │
│  │ APP_MODE=school             │  │ APP_MODE=org            │  │
│  └──────────────────────────────┘  └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Separation Boundaries (Never Shared)

| Component | School ERP | Org/Demo | Isolation Method |
|-----------|------------|----------|------------------|
| Source Code | ✅ Same | ✅ Same | `APP_MODE` env var |
| Database | `zenova_prod` | `zenova_org` | Different DB names |
| Redis | Port 6379 | Port 6380 | Different ports |
| Backend API | Port 8000 | Port 8001 | Different ports |
| Frontend | Port 3000 | Port 3001 | Different ports |
| Nginx | Bind IP A | Bind IP B | IP-specific listen |
| Auth Config | School roles | SUPER_ADMIN only | Middleware guard |
| Uploads | `/data/school` | `/data/org` | Different volumes |
| Logs | Separate containers | Separate containers | Docker isolation |

---

## 3. Network Configuration

### 3.1 Netplan (Ubuntu Standard)

**File:** `/etc/netplan/00-installer-config.yaml` (or similar)

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    <INTERFACE_NAME>:          # e.g., eno1, ens18, eth0
      dhcp4: false
      addresses:
        - 192.168.1.6/24       # Primary IP (PRESERVE EXISTING)
        - 192.168.1.XXX/24     # Secondary IP (NEW - from inspection)
      routes:
        - to: default
          via: 192.168.1.1     # Gateway from inspection
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

**Apply:** `sudo netplan apply`  
**Verify:** `ip addr show <INTERFACE_NAME>` — must show both IPs

### 3.2 IP Allocation Strategy

| IP | System | Purpose | Notes |
|----|--------|---------|-------|
| 192.168.1.6 | School ERP | Production school operations | Already configured |
| 192.168.1.XXX | Org/Demo | Control Center, licensing, provisioning | First free IP in subnet |

**Finding Available IP:**
```bash
# Scan subnet for used IPs
nmap -sn 192.168.1.0/24 | grep "Nmap scan report"
# Or check DHCP leases on router
# Pick first unused IP in 192.168.1.10-192.168.1.254 range
```

---

## 4. Docker Compose Deployments

### 4.1 School ERP — `/home/p/deploy-school/docker-compose.yml`

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:1.26-alpine
    ports:
      - "192.168.1.6:80:80"
      - "192.168.1.6:443:443"
    volumes:
      - ./nginx-school.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - certbot-data:/var/www/certbot
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER:-zenova}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME:-zenova_prod}
    volumes:
      - school-pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-zenova} -d ${DB_NAME:-zenova_prod}"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass "${REDIS_PASSWORD}"
    volumes:
      - school-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  backend:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    expose: ["8000"]
    environment:
      DATABASE_URL: "postgresql://${DB_USER:-zenova}:${DB_PASSWORD}@db:5432/${DB_NAME:-zenova_prod}"
      REDIS_URL: "redis://:${REDIS_PASSWORD}@redis:6379/0"
      ENVIRONMENT: "production"
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      SECRET_KEY: ${SECRET_KEY}
      ALLOWED_ORIGINS: "https://192.168.1.6"
      CORS_ORIGINS: "https://192.168.1.6"
      ZENOVA_LICENSE_SERVER: ${ZENOVA_LICENSE_SERVER}
      LICENSE_SERVER_URL: ${ZENOVA_LICENSE_SERVER}
      ZENOVA_APP_MODE: "school"
      MASTER_SETUP_KEY: ${MASTER_SETUP_KEY}
    volumes:
      - school-server-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/live"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 60s
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    restart: unless-stopped

  frontend:
    image: zenova/frontend:${ZENOVA_VERSION:-latest}
    expose: ["3000"]
    environment:
      ZENOVA_API_URL: "http://backend:8000/api/v1"
      ZENOVA_APP_MODE: "school"
      NEXT_PUBLIC_API_URL: "https://192.168.1.6/api/v1"
      NEXT_PUBLIC_WS_URL: "wss://192.168.1.6/ws"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 30s
    depends_on:
      backend: {condition: service_healthy}
    restart: unless-stopped

  sync-worker:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    entrypoint: ["python", "-m", "app.workers.sync_worker", "30"]
    healthcheck: {disable: true}
    environment:
      DATABASE_URL: "postgresql://${DB_USER:-zenova}:${DB_PASSWORD}@db:5432/${DB_NAME:-zenova_prod}"
      REDIS_URL: "redis://:${REDIS_PASSWORD}@redis:6379/0"
      ENVIRONMENT: "production"
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    restart: unless-stopped

  backup-worker:
    image: postgres:16-alpine
    entrypoint: |
      sh -c 'while true; do
        pg_dump "postgresql://${DB_USER:-zenova}:${DB_PASSWORD}@db:5432/${DB_NAME:-zenova_prod}"
        --no-owner --no-acl -f /backups/zenova_school_$$(date +%%Y%%m%%d_%%H%%M%%S).sql &&
        find /backups -name "zenova_school_*.sql" -mtime +7 -delete;
        sleep 86400; done'
    depends_on: [db]
    volumes:
      - ./backups:/backups
    environment:
      DB_USER: ${DB_USER:-zenova}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME:-zenova_prod}
    healthcheck: {disable: true}
    restart: unless-stopped

volumes:
  school-pgdata:
  school-redis-data:
  school-server-data:
  certbot-data:
```

### 4.2 Org/Demo — `/home/p/deploy-org/docker-compose.yml`

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:1.26-alpine
    ports:
      - "192.168.1.XXX:80:80"
      - "192.168.1.XXX:443:443"
    volumes:
      - ./nginx-org.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - certbot-data:/var/www/certbot
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${ORG_DB_USER:-org_admin}
      POSTGRES_PASSWORD: ${ORG_DB_PASSWORD}
      POSTGRES_DB: ${ORG_DB_NAME:-zenova_org}
    volumes:
      - org-pgdata:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${ORG_DB_USER:-org_admin} -d ${ORG_DB_NAME:-zenova_org}"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass "${ORG_REDIS_PASSWORD}"
    volumes:
      - org-redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${ORG_REDIS_PASSWORD}", "ping"]
      interval: 10s; timeout: 5s; retries: 5
    restart: unless-stopped

  backend:
    image: zenova/backend:${ZENOVA_VERSION:-latest}
    expose: ["8001"]
    environment:
      DATABASE_URL: "postgresql://${ORG_DB_USER:-org_admin}:${ORG_DB_PASSWORD}@db:5433/${ORG_DB_NAME:-zenova_org}"
      REDIS_URL: "redis://:${ORG_REDIS_PASSWORD}@redis:6380/0"
      ENVIRONMENT: "production"
      REDIS_PASSWORD: ${ORG_REDIS_PASSWORD}
      SECRET_KEY: ${ORG_SECRET_KEY}
      ALLOWED_ORIGINS: "https://192.168.1.XXX"
      CORS_ORIGINS: "https://192.168.1.XXX"
      ZENOVA_LICENSE_SERVER: ${ORG_LICENSE_SERVER}
      ZENOVA_APP_MODE: "org"
    volumes:
      - org-server-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/api/v1/health/live"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 60s
    depends_on:
      db: {condition: service_healthy}
      redis: {condition: service_healthy}
    restart: unless-stopped

  frontend:
    image: zenova/frontend:${ZENOVA_VERSION:-latest}
    expose: ["3001"]
    environment:
      ZENOVA_API_URL: "http://backend:8001/api/v1"
      ZENOVA_APP_MODE: "org"
      NEXT_PUBLIC_API_URL: "https://192.168.1.XXX/api/v1"
      NEXT_PUBLIC_WS_URL: "wss://192.168.1.XXX/ws"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/"]
      interval: 30s; timeout: 10s; retries: 3; start_period: 30s
    depends_on:
      backend: {condition: service_healthy}
    restart: unless-stopped

volumes:
  org-pgdata:
  org-redis-data:
  org-server-data:
  certbot-data:
```

---

## 5. Nginx Configurations

### 5.1 School ERP — `nginx-school.conf`

```nginx
events { worker_connections 1024; }

http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    upstream backend { server backend:8000; }
    upstream frontend { server frontend:3000; }

    # HTTP redirect
    server {
        listen 192.168.1.6:80;
        server_name _;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 301 https://$host$request_uri; }
    }

    # HTTPS
    server {
        listen 192.168.1.6:443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' ws: wss:; frame-ancestors 'none';" always;

        location /runtime-config.js {
            add_header Content-Type application/javascript;
            add_header Cache-Control "public, max-age=31536000, immutable";
            return 200 "window.__RUNTIME_CONFIG__ = { API_URL: '/api/v1', APP_MODE: 'school' };";
        }

        location /api/v1/ws {
            proxy_pass http://backend/api/v1/ws;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400s;
        }

        location /api/v1/ {
            proxy_pass http://backend/api/v1/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            limit_req zone=api burst=20 nodelay;
            limit_req_status 429;
        }

        location / { proxy_pass http://frontend; proxy_set_header Host $host; }
    }
}
```

### 5.2 Org/Demo — `nginx-org.conf`

```nginx
events { worker_connections 1024; }

http {
    upstream backend { server backend:8001; }
    upstream frontend { server frontend:3001; }

    server {
        listen 192.168.1.XXX:80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 192.168.1.XXX:443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;

        location /runtime-config.js {
            add_header Content-Type application/javascript;
            add_header Cache-Control "public, max-age=31536000, immutable";
            return 200 "window.__RUNTIME_CONFIG__ = { API_URL: '/api/v1', APP_MODE: 'org' };";
        }

        location /api/v1/ {
            proxy_pass http://backend/api/v1/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 120s;
            client_max_body_size 200M;
        }

        location / { proxy_pass http://frontend; proxy_set_header Host $host; }
    }
}
```

---

## 6. Environment Files

### 6.1 School ERP — `/home/p/deploy-school/.env`

```bash
DOMAIN=192.168.1.6
DOMAIN_URL=https://192.168.1.6

DB_USER=zenova
DB_PASSWORD=<strong-password>
DB_NAME=zenova_prod

REDIS_PASSWORD=<strong-redis-password>

SECRET_KEY=<64-char-random>
ZENOVA_LICENSE_SERVER=http://192.168.1.XXX  # Points to Org IP
MASTER_SETUP_KEY=<super-admin-master-key>

ZENOVA_VERSION=latest
```

### 6.2 Org/Demo — `/home/p/deploy-org/.env`

```bash
DOMAIN=192.168.1.XXX
DOMAIN_URL=https://192.168.1.XXX

ORG_DB_USER=org_admin
ORG_DB_PASSWORD=<strong-password>
ORG_DB_NAME=zenova_org

ORG_REDIS_PASSWORD=<strong-redis-password>

ORG_SECRET_KEY=<64-char-random-different-from-school>
ORG_LICENSE_SERVER=http://192.168.1.XXX  # Self-referential for demo

ZENOVA_VERSION=latest
```

---

## 7. Firewall Rules (UFW)

```bash
# Reset and configure
ufw --force reset

# SSH (ensure you don't lock yourself out)
ufw allow 22/tcp

# School ERP (IP A)
ufw allow from 192.168.1.0/24 to 192.168.1.6 port 80,443 proto tcp

# Org/Demo (IP B)
ufw allow from 192.168.1.0/24 to 192.168.1.XXX port 80,443 proto tcp

# Block internal ports from LAN
ufw deny from 192.168.1.0/24 to any port 8000,8001,3000,3001,5432,5433,6379,6380 proto tcp

# Enable
ufw --force enable
ufw status verbose
```

---

## 8. Service Management (systemd)

### 8.1 School ERP Service — `/etc/systemd/system/zenova-school.service`

```ini
[Unit]
Description=ZENOVA School ERP
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/p/deploy-school
ExecStart=/usr/bin/docker compose --env-file .env up -d
ExecStop=/usr/bin/docker compose --env-file .env down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

### 8.2 Org/Demo Service — `/etc/systemd/system/zenova-org.service`

```ini
[Unit]
Description=ZENOVA Organization/Demo
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/p/deploy-org
ExecStart=/usr/bin/docker compose --env-file .env up -d
ExecStop=/usr/bin/docker compose --env-file .env down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

**Enable:**
```bash
systemctl daemon-reload
systemctl enable zenova-school zenova-org
systemctl start zenova-school zenova-org
```

---

## 9. Validation Checklist

### 9.1 Network Validation
- [ ] `ip addr show <interface>` shows both IPs
- [ ] `ping 192.168.1.6` from LAN client ✓
- [ ] `ping 192.168.1.XXX` from LAN client ✓
- [ ] No IP conflicts: `arp-scan 192.168.1.0/24`

### 9.2 Service Validation
- [ ] `docker ps` shows 7 containers per deployment (14 total)
- [ ] `curl -k https://192.168.1.6/api/v1/health/live` → `{"status":"alive"}`
- [ ] `curl -k https://192.168.1.XXX/api/v1/health/live` → `{"status":"alive"}`
- [ ] `curl -k https://192.168.1.6/runtime-config.js` → `APP_MODE: "school"`
- [ ] `curl -k https://192.168.1.XXX/runtime-config.js` → `APP_MODE: "org"`

### 9.3 Application Validation
- [ ] Browser: `https://192.168.1.6` → School login page (`/login`)
- [ ] Browser: `https://192.168.1.XXX` → Org login page (`/super-admin/login`)
- [ ] School login works with school admin credentials
- [ ] Org login works with SUPER_ADMIN credentials
- [ ] No cross-access: School IP returns 307 for `/super-admin/*`
- [ ] No cross-access: Org IP returns 307 for `/admin/*`, `/registrar/*`, etc.

### 9.4 Database Validation
- [ ] `docker exec school-db pg_isready` ✓
- [ ] `docker exec org-db pg_isready` ✓
- [ ] Separate databases confirmed: `\l` in each shows different DBs
- [ ] Migrations applied: `alembic current` in both backends = head

### 9.5 Persistence Validation
- [ ] `sudo reboot` → both IPs come up automatically
- [ ] `systemctl status zenova-school zenova-org` → active
- [ ] Services start in correct order (DB → Redis → Backend → Frontend → Nginx)

---

## 10. Recovery Procedures

### 10.1 Network Failure
```bash
# 1. Boot from Ubuntu Live USB
# 2. Mount root partition
# 3. Fix /etc/netplan/*.yaml
# 4. sudo netplan apply
# 5. Reboot
```

### 10.2 Service Failure
```bash
# Check logs
journalctl -u zenova-school -f
journalctl -u zenova-org -f

# Or docker logs
docker logs deploy-school-backend-1
docker logs deploy-org-backend-1

# Restart single service
docker compose -f /home/p/deploy-school/docker-compose.yml restart backend
```

### 10.3 Database Recovery
```bash
# School ERP
docker exec school-db pg_dump -U zenova zenova_prod > school_backup.sql

# Org/Demo
docker exec org-db pg_dump -U org_admin zenova_org > org_backup.sql
```

### 10.4 Complete Reset (Destructive)
```bash
# School ERP
cd /home/p/deploy-school
docker compose --env-file .env down -v
# Remove volumes if needed
docker compose --env-file .env up -d

# Org/Demo
cd /home/p/deploy-org
docker compose --env-file .env down -v
docker compose --env-file .env up -d
```

---

## 11. Deployment Order

1. **Network:** Add secondary IP via Netplan → `netplan apply`
2. **Firewall:** Configure UFW rules for both IPs
3. **School ERP:** Deploy to `/home/p/deploy-school/` → start service
4. **Verify School:** Health checks + browser login
5. **Org/Demo:** Deploy to `/home/p/deploy-org/` → start service
6. **Verify Org:** Health checks + browser login
7. **Cross-test:** Ensure no route leakage between IPs
8. **Reboot test:** `sudo reboot` → verify both systems auto-start
9. **Document:** Record final IPs, passwords, configs

---

## 12. Critical Rules

1. **NEVER** modify netplan without backup
2. **NEVER** use `dhcp4: true` if static IPs required
3. **NEVER** bind nginx to `0.0.0.0` — always specific IP
4. **NEVER** share database/redis between systems
5. **NEVER** use same ports for both systems
6. **ALWAYS** verify `APP_MODE` in runtime-config.js matches deployment
7. **ALWAYS** test from LAN client (not localhost on server)
8. **ALWAYS** reboot test before declaring success

---

*Document Version: 1.0*  
*Generated: 2026-08-24*  
*Pending: Physical server inspection to fill TBD values*