# ZENOVA Engineering Report — 2026-08-24

**Agent:** Autonomous Engineering Agent (Nemotron 3 Ultra 550B)  
**Scope:** Full project analysis, two-IP architecture design, documentation  
**Duration:** Single session  
**Status:** Design Complete — Execution Pending Server Access

---

## Objective

Analyze the complete ZENOVA project architecture and design a two-IP deployment for a single physical Ubuntu Server hosting both:
- **School ERP** (IP A: 192.168.1.6) — Customer-facing school operations
- **Organization/Demo** (IP B: TBD) — Control Center, licensing, provisioning

---

## Investigation Summary

### Project Structure Analyzed

| Component | Location | Key Files |
|-----------|----------|-----------|
| Backend | `backend/` | FastAPI, 56 endpoints, 48 services, 85+ models |
| Frontend | `frontend/` | Next.js 16, 14 route groups, 30+ UI components |
| Control Center | `control-center/` | Private admin panel (Org system) |
| License Server | `license-server/` | Cloud validation API (Render.com) |
| Deployment | `deploy/` | Docker Compose, Nginx, install.sh |
| Mobile App | `mobile-app/` | Expo/React Native (APU phases 1-3) |
| Documentation | `docs/` | 100+ markdown files |

### Architecture Understanding

**Multi-Product Single Codebase:**
- `APP_MODE=school` → School ERP (ports 8000, 3000, 5432, 6379)
- `APP_MODE=org` → Control Center (ports 8001, 3001, 5432)
- Separation enforced at: middleware, runtime config, nginx, docker compose

**Current Deployment (from deploy/):**
- `docker-compose.vps.yml` — School ERP (nginx 80/443, backend 8000, frontend 3000)
- `docker-compose.cc.yml` — Control Center (nginx 80/443, backend 8001, frontend 3001)
- Both nginx configs bind to `0.0.0.0` (all interfaces) — needs change for two-IP

**Runtime Config System:**
- `/runtime-config.js` served by nginx → `window.__RUNTIME_CONFIG__`
- Client: `getApiUrl()`, `getAppMode()` from `runtime-config.ts`
- Middleware: `process.env.ZENOVA_API_URL`, `process.env.ZENOVA_APP_MODE`

---

## Problems Identified

### 1. SSH Access to Physical Server Blocked
- **Symptom:** SSH to `p@192.168.1.6` times out (permission denied, then timeout)
- **Cause:** Likely firewall (UFW) blocking port 22, or SSH key not authorized
- **Credentials:** User `p`, password `p` (per AGENTS.md), key `~/.ssh/zenova_server`
- **Impact:** Cannot run network inspection to get exact interface, gateway, available IPs

### 2. Outdated .env.vps Configuration
```bash
# Current .env.vps has old VM IPs:
DOMAIN=10.195.176.132           # Should be 192.168.1.6
ZENOVA_LICENSE_SERVER=http://10.195.176.133  # Old VM Org IP
```
- Must regenerate with physical server IPs after inspection

### 3. Secondary IP Not Allocated
- Need to scan 192.168.1.0/24 subnet for available IP
- Cannot determine until server inspection complete

---

## Solutions Designed

### Two-IP Architecture (Complete Design)

**File Created:** `docs/infrastructure/ZENOVA_TWO_IP_ARCHITECTURE.md`

| System | IP | Nginx Bind | Backend | Frontend | DB | Redis | APP_MODE |
|--------|-----|------------|---------|----------|-----|-------|----------|
| School ERP | 192.168.1.6 | 192.168.1.6:80/443 | 127.0.0.1:8000 | 127.0.0.1:3000 | 5432 (zenova_prod) | 6379 | school |
| Org/Demo | 192.168.1.XXX | 192.168.1.XXX:80/443 | 127.0.0.1:8001 | 127.0.0.1:3001 | 5433 (zenova_org) | 6380 | org |

**Complete Configurations Created:**
- Netplan YAML (preserves existing 192.168.1.6, adds secondary)
- Two docker-compose.yml files (deploy-school/, deploy-org/)
- Two nginx configs (IP-specific listen directives)
- Two .env files (separate secrets, DB names, ports)
- UFW firewall rules (allow 80/443 on both IPs, deny internal ports)
- Two systemd services (zenova-school, zenova-org)

### Documentation Created/Updated

| File | Purpose |
|------|---------|
| `docs/ai-engineering/PROJECT_ANALYSIS.md` | Full architecture, backend, frontend, DB, security, test analysis |
| `docs/ai-engineering/CURRENT_STATUS.md` | Current status, completed, in-progress, planned |
| `docs/ai-engineering/ARCHITECTURE_DECISIONS.md` | 10 ADRs with rationale |
| `docs/infrastructure/ZENOVA_TWO_IP_ARCHITECTURE.md` | Complete deployment design with configs |
| `docs/CHANGELOG.md` | Added [1.0.0-two-ip] entry |

---

## Root Causes

| Issue | Root Cause |
|-------|------------|
| SSH blocked | Physical server firewall/UFW likely denies port 22; SSH key not in authorized_keys |
| Two-IP not deployed | Design not completed until this session; was pending server inspection |
| .env.vps outdated | Last deployment was to VM (10.195.176.x), not physical server (192.168.1.6) |

---

## Fixes Applied (Design Level)

1. **Netplan Strategy:** Add secondary IP to existing interface, preserve primary
2. **Port Allocation:** Explicit table prevents conflicts (8000/8001, 3000/3001, 5432/5433, 6379/6380)
3. **Nginx Binding:** IP-specific `listen` directives (not `0.0.0.0`)
4. **APP_MODE Isolation:** Middleware + runtime config + nginx + docker all aligned
5. **Database Separation:** Different DB names, different PostgreSQL ports
5. **Redis Separation:** Different ports, different passwords
6. **Service Management:** systemd services for independent start/stop/restart

---

## Files Changed (Local)

```
docs/ai-engineering/PROJECT_ANALYSIS.md          (created - full analysis)
docs/ai-engineering/CURRENT_STATUS.md            (created - status tracking)
docs/ai-engineering/ARCHITECTURE_DECISIONS.md    (created - 10 ADRs)
docs/infrastructure/ZENOVA_TWO_IP_ARCHITECTURE.md (created - complete deployment design)
docs/CHANGELOG.md                                 (updated - [1.0.0-two-ip] entry)
NETWORK_INSPECTION_COMMANDS.sh                   (created - server inspection script)
ZENOVA_TWO_IP_SETUP_PLAN.md                      (created - phased plan)
```

---

## Validation Criteria (Not Yet Executed)

### Network
- [ ] `ip addr` shows both IPs on same interface
- [ ] `ping` works from LAN client to both IPs

### Services
- [ ] `docker ps` → 7 containers per deployment (14 total)
- [ ] `curl -k https://192.168.1.6/api/v1/health/live` → `{"status":"alive"}`
- [ ] `curl -k https://192.168.1.XXX/api/v1/health/live` → `{"status":"alive"}`

### Application
- [ ] Browser: `https://192.168.1.6` → School login (`/login`)
- [ ] Browser: `https://192.168.1.XXX` → Org login (`/super-admin/login`)
- [ ] No cross-access: School IP blocks `/super-admin/*`, Org IP blocks school routes

### Persistence
- [ ] `sudo reboot` → both IPs + services auto-start
- [ ] `systemctl status zenova-school zenova-org` → active

---

## Remaining Work (Requires Server Access)

### Priority 1: Server Access
1. Resolve SSH access (console, firewall rule, or key setup)
2. Run `NETWORK_INSPECTION_COMMANDS.sh` on physical server
3. Capture output for exact interface, gateway, available IPs

### Priority 2: Network Configuration
1. Backup `/etc/netplan/*.yaml`
2. Add secondary IP to netplan
3. `sudo netplan apply`
4. Verify both IPs with `ip addr`
5. Configure UFW for both IPs

### Priority 3: Deployment
1. Create `/home/p/deploy-school/` with school docker-compose + nginx + .env
2. Create `/home/p/deploy-org/` with org docker-compose + nginx + .env
3. Load Docker images (or build from source)
4. Start services via systemd
6. Run migrations on both databases

### Priority 4: Validation
1. Health checks on both IPs
2. Browser login on both systems
3. Cross-access verification
4. Reboot test

### Priority 5: Documentation
1. Update `ZENOVA_TWO_IP_ARCHITECTURE.md` with actual deployed values
2. Record final IPs, passwords, configs

---

## Metrics

| Metric | Before | After (Design) |
|--------|--------|----------------|
| Architecture Docs | Scattered | Centralized (4 new files) |
| Two-IP Design | None | Complete with configs |
| Deployment Configs | 2 (shared nginx) | 4 (IP-specific) |
| ADRs Documented | 0 | 10 |
| Project Analysis | Partial | Complete (all layers) |

---

## Next Session Plan

1. **Gain server access** (resolve SSH/firewall)
2. **Run inspection** → fill TBD values in architecture doc
3. **Execute deployment** per phased plan
4. **Validate** → browser + API + reboot test
5. **Finalize docs** with actual values

---

*Report generated by Autonomous Engineering Agent*  
*No manual commands executed on server — SSH access pending*  
*All design work based on local project analysis*