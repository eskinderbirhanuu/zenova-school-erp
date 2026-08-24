# ZENOVA School ERP — PROJECT ANALYSIS

**Date:** 2026-08-24  
**Analyst:** Autonomous Engineering Agent  
**Scope:** Full-stack architecture, backend, frontend, database, security, deployment, two-IP server configuration  
**Status:** Complete Local Analysis — Ready for Server Implementation

---

## Executive Summary

ZENOVA is a comprehensive enterprise-grade School Management Platform built with FastAPI (Python 3.12+) backend and Next.js 16 (React 19) frontend. The system serves small-to-international multi-campus schools with offline-first capabilities, dynamic RBAC, and a modular architecture.

**Overall Score: 8/10** — Production-ready for single-school deployment with well-understood architecture for dual-IP deployment.

---

## 1. Architecture Analysis

### 1.1 Project Structure

```
ZENOVA/
├── backend/                 # FastAPI + SQLAlchemy (ERP source)
│   ├── app/
│   │   ├── api/v1/endpoints/   # 56 endpoint files, 289+ routes
│   │   ├── services/           # 48 service files
│   │   ├── models/             # 85+ SQLAlchemy models
│   │   ├── schemas/            # Pydantic validation
│   │   ├── core/               # Auth, permissions, audit, scheduler
│   │   └── config.py           # Settings (pydantic-settings)
│   ├── alembic/                # 30+ migrations
│   └── tests/                  # 380+ pytest tests
├── frontend/                # Next.js 16 + React 19
│   ├── src/
│   │   ├── app/                # App Router (14 route groups)
│   │   ├── components/         # 30+ UI components (Radix + Tailwind)
│   │   ├── lib/                # runtime-config.ts, runtime config
│   │   ├── config/             # roles.ts (RBAC definitions)
│   │   ├── hooks/              # React Query hooks
│   │   └── services/           # API client (axios)
│   └── public/runtime-config.js  # Runtime config (no rebuild)
├── control-center/          # Private admin panel (Org system)
│   ├── backend/              # FastAPI on port 8001
│   ├── frontend/             # Next.js on port 3001
│   └── docker-compose.yml
├── license-server/          # Cloud license validation (Render.com)
├── deploy/                  # VPS deployment scripts
│   ├── docker-compose.vps.yml    # School ERP (ports 80/443, 8000, 3000, 5432, 6379)
│   ├── docker-compose.cc.yml     # Control Center (ports 80/443, 8001, 3001, 5432)
│   ├── nginx.conf                # School ERP reverse proxy
│   ├── nginx.cc.conf             # Control Center reverse proxy
│   └── install.sh                # One-command installer
├── mobile-app/              # Expo/React Native (APU phases 1-3)
├── docs/                    # 100+ documentation files
└── school-erp/              # Customer Docker package
```

### 1.2 Multi-Product Architecture (Critical for Two-IP)

**Single codebase produces TWO products:**

| Product | Purpose | Ports | APP_MODE | Database |
|---------|---------|-------|----------|----------|
| **School ERP** | Customer-facing school operations | 8000, 3000, 5432, 6379 | `school` | `zenova_prod` |
| **Control Center (Org)** | Admin panel, license mgmt, provisioning | 8001, 3001, 5432 | `org` | `zenova_control` |

**Separation enforced at:**
- **Middleware** (`proxy.ts`): `ZENOVA_APP_MODE` env var → blocks cross-access
- **Client runtime** (`runtime-config.ts`): `/runtime-config.js` → `APP_MODE`
- **Nginx**: Separate configs bind to different IPs
- **Docker Compose**: Separate service definitions with different ports

---

## 2. Current Deployment Architecture (from deploy/)

### 2.1 School ERP (docker-compose.vps.yml)
```yaml
Services:
  nginx:     80, 443 → binds to all interfaces (0.0.0.0)
  backend:   expose 8000 (internal)
  frontend:  expose 3000 (internal)
  db:        5432 (internal)
  redis:     6379 (internal)
  sync-worker, backup-worker, certbot

Environment:
  ZENOVA_APP_MODE: school
  ZENOVA_API_URL: http://backend:8000/api/v1
```

### 2.2 Control Center (docker-compose.cc.yml)
```yaml
Services:
  nginx:     80, 443 → binds to all interfaces (0.0.0.0)
  backend:   expose 8001 (internal)
  frontend:  expose 3001 (internal)
  db:        5432 (internal)

Environment:
  ZENOVA_APP_MODE: org (implied, not explicitly set)
```

### 2.3 Nginx Configuration

**School ERP (nginx.conf):**
- Single server block listening on `443 ssl http2` with `server_name _`
- Serves `/runtime-config.js` with `APP_MODE: 'school'`
- Proxies `/api/v1/` → `backend:8000`, `/` → `frontend:3000`
- WebSocket support at `/api/v1/ws` and `/ws`

**Control Center (nginx.cc.conf):**
- Similar structure, backend on `8001`, frontend on `3001`
- No `/runtime-config.js` endpoint (uses build-time config)

---

## 3. Two-IP Architecture Design

### 3.1 Current Physical Server State (from .env.vps)
- **Current IP:** 192.168.1.6 (School ERP)
- **Gateway:** 192.168.1.1 (inferred from subnet)
- **Subnet:** 192.168.1.0/24
- **Interface:** Need to inspect (likely eno1/ens18/eth0)
- **Network Config:** Netplan (Ubuntu 22.04/24.04)

### 3.2 Target Configuration

| System | IP | Nginx Bind | Backend | Frontend | DB | Redis | APP_MODE |
|--------|-----|------------|---------|----------|-----|-------|----------|
| School ERP | 192.168.1.6 | 192.168.1.6:80/443 | 127.0.0.1:8000 | 127.0.0.1:3000 | 127.0.0.1:5432 | 127.0.0.1:6379 | school |
| Org/Demo | 192.168.1.XXX | 192.168.1.XXX:80/443 | 127.0.0.1:8001 | 127.0.0.1:3001 | 127.0.0.1:5433 | 127.0.0.1:6380 | org |

**Available Secondary IP:** Must be determined from inspection (192.168.1.101 if free, otherwise next available in /24)

### 3.3 Required Changes

#### A. Netplan (add secondary IP to existing interface)
```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    <INTERFACE>:
      dhcp4: false
      addresses:
        - 192.168.1.6/24      # Existing primary (PRESERVE)
        - 192.168.1.XXX/24    # NEW secondary IP
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

#### B. Two Docker Compose Deployments
**`/home/p/deploy-school/docker-compose.yml`** (School ERP)
- Nginx binds `192.168.1.6:80,443`
- Backend `8000`, Frontend `3000`, DB `5432`, Redis `6379`
- `ZENOVA_APP_MODE=school`

**`/home/p/deploy-org/docker-compose.yml`** (Org/Demo)
- Nginx binds `192.168.1.XXX:80,443`
- Backend `8001`, Frontend `3001`, DB `5433`, Redis `6380`
- `ZENOVA_APP_MODE=org`

#### C. Two Nginx Configs
**School ERP nginx:** `listen 192.168.1.6:80; listen 192.168.1.6:443 ssl;`
**Org nginx:** `listen 192.168.1.XXX:80; listen 192.168.1.XXX:443 ssl;`

#### D. Firewall (UFW)
```bash
ufw allow from 192.168.1.0/24 to 192.168.1.6 port 80,443
ufw allow from 192.168.1.0/24 to 192.168.1.XXX port 80,443
ufw deny 8000,8001,3000,3001,5432,5433,6379,6380
ufw enable
```

---

## 4. Implementation Plan

### Phase 1: Server Inspection (Complete Locally)
- ✅ Project architecture analyzed
- ✅ Deployment configs reviewed
- ✅ Two-system separation understood
- ⏳ Physical server network inspection (SSH blocked by firewall)

### Phase 2: Network Configuration (On Server)
1. Inspect current netplan: `cat /etc/netplan/*.yaml`
2. Identify interface: `ip addr`
3. Backup netplan: `cp /etc/netplan/00-installer-config.yaml /etc/netplan/00-installer-config.yaml.bak`
4. Add secondary IP to netplan
5. Apply: `sudo netplan apply`
6. Verify: `ip addr show <interface>`

### Phase 3: Deploy School ERP (192.168.1.6)
1. Create `/home/p/deploy-school/` with school-specific docker-compose
2. Configure nginx to bind only 192.168.1.6
3. Load images, start services
4. Run migrations
5. Verify: `curl -k https://192.168.1.6/api/v1/health/live`

### Phase 4: Deploy Org/Demo (Secondary IP)
1. Create `/home/p/deploy-org/` with org-specific docker-compose
2. Configure nginx to bind only secondary IP
3. Load images, start services
4. Run migrations
5. Verify: `curl -k https://192.168.1.XXX/api/v1/health/live`

### Phase 5: Validation
- Both IPs respond independently
- School ERP only accessible via 192.168.1.6
- Org only accessible via secondary IP
- No cross-access possible
- Reboot survival test

---

## 5. Documentation to Create

- `docs/infrastructure/ZENOVA_TWO_IP_ARCHITECTURE.md`
- `docs/infrastructure/NETWORK_CONFIG.md`
- `docs/infrastructure/DEPLOYMENT_GUIDE.md`
- `docs/infrastructure/RECOVERY_PROCEDURE.md`

---

## 6. Next Steps

1. **Gain SSH access to physical server** (resolve firewall/port issue)
2. **Run network inspection** to get exact interface, gateway, available IPs
3. **Execute phased deployment** as designed above
3. **Validate both systems** independently
4. **Document final configuration**

---

*Generated by Autonomous Engineering Agent*  
*Based on local project analysis (SSH to physical server pending)*