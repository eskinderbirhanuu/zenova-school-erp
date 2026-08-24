# ZENOVA Architecture Decisions

**Last Updated:** 2026-08-24  
**Scope:** Significant architectural decisions with rationale and alternatives considered

---

## ADR-001: Payment Gateway Plugin Architecture

**Date:** 2026-07-15  
**Status:** Accepted

### Decision
Use a plugin architecture via `PaymentGatewayFactory` for payment gateways (Cash, Bank, Telebirr, Chapa).

### Rationale
- New gateways can be added without modifying core code
- Each gateway isolated — failure in one doesn't affect others
- Feature-flagged via `FEATURE_CHAPA` etc.
- Clean separation: `PaymentGatewayFactory.register(name, class)`

### Alternatives Considered
- Single service with if/else chains — rejected (violates OCP)
- Separate microservices — rejected (overkill for current scale)

---

## ADR-002: APP_MODE Separation (School vs Org)

**Date:** 2026-08-23  
**Status:** Accepted — Implemented

### Decision
Single codebase, two deploy-time identities via `APP_MODE` environment variable:
- `APP_MODE=school` → School ERP (customer-facing)
- `APP_MODE=org` → Control Center (admin-only)

### Enforcement Layers
1. **Middleware** (`proxy.ts`): Server-side redirect based on `ZENOVA_APP_MODE`
2. **Client Runtime** (`runtime-config.ts`): Reads `/runtime-config.js` → `APP_MODE`
3. **Nginx**: IP-specific server blocks bind to different addresses
4. **Docker Compose**: Separate service definitions with different ports

### Routes Separation
| Mode | Login | Installer | Allowed Routes | Blocked Routes |
|------|-------|-----------|----------------|----------------|
| school | `/login` | `/installer/school` | `/admin`, `/registrar`, `/teacher`, `/finance`, `/hr`, `/inventory`, `/library`, `/cafeteria`, `/auditor`, `/director`, `/corporate`, `/parent`, `/student` | `/super-admin/*` |
| org | `/super-admin/login` | `/installer/super-admin` | `/super-admin/*` | All school routes |

### Rationale
- Single codebase to maintain
- Clear boundary — no accidental cross-access
- Deploy-time decision, no runtime ambiguity
- Customer never receives Org code (Control Center stays private)

### Alternatives Considered
- Separate repositories — rejected (duplication, sync burden)
- Feature flags only — rejected (routes still accessible, security risk)
- Separate Docker images — rejected (same image, different config is cleaner)

---

## ADR-003: Two-IP Deployment on Single Physical Server

**Date:** 2026-08-24  
**Status:** Designed — Pending Implementation

### Decision
Deploy both ZENOVA systems on one physical Ubuntu Server using two IP addresses on the same network interface.

### Configuration
```
Physical Server (Ubuntu)
├── Interface: <interface> (e.g., eno1)
├── IP A: 192.168.1.6/24 → School ERP
│   ├── Nginx: 192.168.1.6:80/443
│   ├── Backend: 127.0.0.1:8000
│   ├── Frontend: 127.0.0.1:3000
│   ├── PostgreSQL: 127.0.0.1:5432 (zenova_prod)
│   └── Redis: 127.0.0.1:6379
└── IP B: 192.168.1.XXX/24 → Org/Demo
    ├── Nginx: 192.168.1.XXX:80/443
    ├── Backend: 127.0.0.1:8001
    ├── Frontend: 127.0.0.1:3001
    ├── PostgreSQL: 127.0.0.1:5433 (zenova_org)
    └── Redis: 127.0.0.1:6380
```

### Netplan Configuration
```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    <interface>:
      dhcp4: false
      addresses:
        - 192.168.1.6/24      # Primary (PRESERVE)
        - 192.168.1.XXX/24    # Secondary (NEW)
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

### Separation Guarantees
| Layer | Mechanism |
|-------|-----------|
| Network | IP-specific Nginx `listen` directives |
| Application | `ZENOVA_APP_MODE` env var → middleware + runtime config |
| Database | Different database names (`zenova_prod` vs `zenova_org`) |
| Redis | Different ports (6379 vs 6380) |
| Backend | Different internal ports (8000 vs 8001) |
| Frontend | Different internal ports (3000 vs 3001) |
| Volumes | Different Docker volumes (school-* vs org-*) |

### Rationale
- Cost-effective: Single server hardware
- Complete isolation: No shared state possible
- Operational simplicity: Same deployment patterns
- Scalable: Can move to separate servers later if needed

### Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Single point of failure | Regular backups, documented recovery |
| Resource contention | Monitor CPU/RAM, separate containers |
| Network misconfiguration | Netplan backup, staged deployment |
| Port conflicts | Explicit port allocation table |

### Alternatives Considered
- **Two physical servers** — Rejected (cost, not needed for demo/org)
- **Different ports on same IP** — Rejected (confusing, firewall complexity, no true isolation)
- **Docker network isolation only** — Rejected (still single IP, no browser-level separation)
- **Kubernetes** — Rejected (overkill for single-server deployment)

---

## ADR-004: Runtime Configuration via `/runtime-config.js`

**Date:** 2026-08-17  
**Status:** Accepted — Implemented

### Decision
Serve runtime configuration via `/runtime-config.js` (static file, bypasses Next.js middleware) instead of build-time environment variables.

### Implementation
```javascript
// public/runtime-config.js (served by nginx directly)
window.__RUNTIME_CONFIG__ = {
  API_URL: "/api/v1",
  APP_MODE: "school"
}
```

### Client Access (`runtime-config.ts`)
```typescript
export function getApiUrl(): string {
  return runtimeUrl() || process.env.NEXT_PUBLIC_API_URL || DEFAULT_URL
}
export function getAppMode(): "school" | "org" { ... }
```

### Middleware Access (`proxy.ts`)
```typescript
const API_URL = process.env.ZENOVA_API_URL || process.env.NEXT_PUBLIC_API_URL || "..."
const APP_MODE = process.env.ZENOVA_APP_MODE || "school"
```

### Rationale
- **No rebuild needed** for per-server config changes
- **Works with standalone output** (Next.js `output: 'standalone'`)
- **Middleware compatible** — server-side reads from `process.env`
- **Client compatible** — reads from `window.__RUNTIME_CONFIG__`
- **nginx serves directly** — bypasses Next.js middleware for `/runtime-config.js`

### Alternatives Considered
- Build-time `NEXT_PUBLIC_API_URL` — Rejected (requires rebuild per server)
- Separate Docker images per server — Rejected (defeats single-image deployment)
- Config API endpoint — Rejected (chicken-egg: need API URL to get API URL)

---

## ADR-005: License Server as Authority (Org Serves School)

**Date:** 2026-08-18  
**Status:** Accepted — Implemented

### Decision
Control Center (Org) serves as the license authority for School ERP deployments.

### Contract
```
GET  /api/v1/license/ping          → {"status":"ok"}
POST /api/v1/license/school-verify → SchoolVerifyResponse (valid, type, status, valid_until, max_users)
POST /api/v1/heartbeat             → HMAC-verified, returns control directives (suspend, force_verify, message)
```

### School ERP Behavior
- Startup: `validate_license_at_startup` calls Org `/license/school-verify`
- Heartbeat: Every 1 hour (was 6h) → Org returns control directives
- Control: School applies `suspend`/`force_verify` via Redis cache

### Rationale
- Centralized license management
- Real-time control (suspend/revoke/expire)
- Works offline with 45-day grace period
- Single source of truth for license state

---

## ADR-006: Offline-First Password Recovery (No Email/SMS)

**Date:** 2026-07-01  
**Status:** Accepted — Implemented

### Decision
Password recovery chain without email/SMS dependency:
```
Super Admin → Recovery Key + 10 Recovery Codes
School Owner → Super Admin
Director/Admin → School Owner
Teacher/Registrar/Staff → Admin
Student → Registrar
Parent → Admin
Emergency → `sudo zenova-reset-password` on Ubuntu server
```

### Implementation
- 10 single-use recovery codes generated at account setup
- HMAC-signed recovery tokens with TTL
- `password_recovery_code_ttl` setting (default 600s)
- Emergency CLI tool for physical server access

### Rationale
- Schools in areas with unreliable email/SMS
- No external dependency for critical recovery
- Audit trail for all recovery actions
- Works completely offline

---

## ADR-007: Database Soft Delete Pattern

**Date:** 2026-06-15  
**Status:** Accepted — Implemented

### Decision
All major entities use soft delete (`deleted_at` timestamp) via SQLAlchemy event listener.

### Implementation
```python
# database.py
@event.listens_for(Session, "do_orm_execute")
def _add_soft_delete_filter(execute_state):
    # Auto-filter deleted_at IS NULL for SELECT queries
```

### Rationale
- Data retention for audit/compliance
- Accidental delete recovery
- Referential integrity without cascade deletes
- GDPR compliance (can purge later)

### Status
- 54 models lack `deleted_at` (partial implementation)
- Plan: Complete migration for all entities

---

## ADR-008: Dual Permission System (To Be Unified)

**Date:** 2026-08-01  
**Status:** Identified — Pending Unification

### Current State
Two coexisting systems:
1. **`require_role`** — String-based role checks (legacy)
2. **`PermissionChecker`** — Granular `resource:action` permissions (new)

### Problems
- Maintenance burden
- Authorization gaps possible
- Inconsistent enforcement

### Decision
Unify into single `PermissionChecker` system. Deprecate `require_role`.

### Migration Plan
1. Map all role-based checks to permission equivalents
2. Update all endpoints to use `require_permission()`
3. Remove `require_role` dependency
4. Add role→permission mapping in database

---

## ADR-009: Feature Flag System for Optional Modules

**Date:** 2026-06-01  
**Status:** Accepted — Implemented

### Decision
Every optional integration uses `FEATURE_<NAME>` boolean environment variable.

### Current Flags
| Flag | Module | Default |
|------|--------|---------|
| `FEATURE_CHAPA` | Chapa payment gateway | false |
| `FEATURE_PUSH` | FCM push notifications | false |
| `FEATURE_TELEBIRR` | Telebirr payment | false |

### Implementation
- **Backend:** `settings.feature_chapa` in `config.py`
- **Frontend:** `useFeatures()` hook fetches `/api/v1/config/features`
- **UI:** Disabled features show "Coming Soon", API calls rejected

### Rationale
- Clean separation: Core never breaks, features optional
- Customer can enable only what they need
- No dead code paths in production

---

## ADR-010: Semantic Versioning + Changelog

**Date:** 2026-06-01  
**Status:** Accepted — Implemented

### Decision
- Semantic Versioning (MAJOR.MINOR.PATCH)
- Changelog in `docs/CHANGELOG.md`
- APU versions: `1.0.0-apu-<feature>`

### Release Process
1. Update `CHANGELOG.md`
2. Tag release: `git tag -a v1.0.0 -m "Release 1.0.0"`
3. Build Docker images with version tag
4. Deploy via `deploy.sh` with `ZENOVA_VERSION`

---

*Document maintained by Autonomous Engineering Agent*  
*All decisions traceable to code implementation*