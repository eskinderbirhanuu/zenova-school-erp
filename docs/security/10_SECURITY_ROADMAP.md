# Security Roadmap

## Overview

Consolidated implementation roadmap covering all 18 anti-piracy layers, prioritized by impact and dependency. The roadmap spans 8 weeks with 4 phases, targeting a production-ready security posture.

## Current Security Score

### Overall: 72/100

| Category | Score | Target |
|----------|-------|--------|
| License System | 75/100 | 95/100 |
| Device Binding | 80/100 | 95/100 |
| Anti-Piracy | 45/100 | 90/100 |
| Docker Protection | 50/100 | 90/100 |
| Backend Protection | 20/100 | 85/100 |
| Frontend Protection | 40/100 | 80/100 |
| Tamper Detection | 30/100 | 90/100 |
| Audit System | 70/100 | 95/100 |
| Disaster Recovery | 15/100 | 85/100 |
| **Overall** | **47/100** | **90/100** |

## Phase 1 — Foundation (Week 1)

### Objectives
Build and deploy the core security infrastructure that everything else depends on.

| Day | Task | Files | Effort |
|-----|------|-------|--------|
| 1 | Compile coreval.c → coreval.pyd | `licensing/coreval.c`, `scripts/build-coreval.py` | 4h |
| 1 | Create gen-license-keys.py | `scripts/gen-license-keys.py` (NEW) | 4h |
| 2 | Deploy cloud license server | `license-server/` (all files) | 8h |
| 3 | Generate RSA key pair + sign first .lic | Key files (secured offline) | 4h |
| 4 | Wire watermark_seed_data() into activation | `services/watermark.py`, activation flow | 4h |
| 5 | Fix SCHOOl_WATERMARK default (per-school) | `config.py`, `watermark.py` | 2h |
| 5 | Move honeytoken registry to DB | `models/honeytoken.py` (NEW) | 4h |

**Gate:** coreval.pyd loads and validates license on 3 reference platforms (Linux, Windows, macOS).

**Risk:** C compilation may fail on Windows without MinGW — fallback to pure-Python with logging.

### Deliverables
- ✅ Compiled .pyd/.so for coreval
- ✅ Cloud license server at superadmin.free.nf
- ✅ gen-license-keys.py for key pair generation
- ✅ First MAIN school .lic file signed and verified
- ✅ Per-school watermarks in database

---

## Phase 2 — Detection & Response (Week 2-3)

### Objectives
Implement multi-installation detection, automated alerting, and tamper detection.

| Day | Task | Files | Effort |
|-----|------|-------|--------|
| 6 | Add IP/geo logging to license validation | `services/license_validator.py` | 4h |
| 7 | Build multi-installation detection engine | `services/piracy_detector.py` (NEW) | 8h |
| 8 | Implement concurrent session tracking (Redis) | `core/session_tracker.py` (NEW) | 6h |
| 9 | Build alerting service (Telegram + Email) | `services/alert_service.py` (NEW) | 6h |
| 10 | Create license-specific audit events | `core/audit.py`, `models/audit_log.py` | 4h |
| 11 | Implement file integrity monitor | `core/integrity.py` (NEW) | 6h |
| 12 | Add startup integrity check | `main.py` startup, `core/integrity.py` | 4h |

**Gate:** Multi-installation detection correctly identifies same license from different IPs.

**Risk:** Geo-IP service may be unreliable offline — implement offline fallback (hostname comparison).

### Deliverables
- ✅ License validation logs source IP + geo
- ✅ Multi-install detection active
- ✅ Alerts sent on suspicious activity
- ✅ File integrity check on every startup
- ✅ 12 new license-specific audit events

---

## Phase 3 — Hardening (Week 4-5)

### Objectives
Harden Docker images, compile backend, obfuscate frontend, and encrypt backups.

| Day | Task | Files | Effort |
|-----|------|-------|--------|
| 13 | Multi-stage backend Dockerfile | `backend/Dockerfile` | 4h |
| 14 | Non-root containers + distroless base | `Dockerfile`, `docker-compose.yml` | 4h |
| 15 | PyArmor obfuscation of app/ | Build pipeline, `pyarmor.conf` | 8h |
| 16 | JavaScript obfuscation plugin | `next.config.ts`, webpack config | 6h |
| 17 | Frontend watermark hardening | `_app.tsx`, anti-tamper code | 3h |
| 18 | Backup encryption (AES-256-GCM) | `scripts/backup.sh`, restore endpoint | 6h |
| 19 | Docker Content Trust signing | CI/CD, deploy script | 4h |

**Gate:** Full Docker build produces images with no raw .py files and obfuscated JS.

**Risk:** PyArmor may break some dynamic imports — test all 289 routes after obfuscation.

### Deliverables
- ✅ Docker containers run as non-root
- ✅ Backend code obfuscated (PyArmor)
- ✅ Frontend JS obfuscated (javascript-obfuscator)
- ✅ Backups encrypted and signed
- ✅ Docker images signed (DCT)

---

## Phase 4 — Resilience (Week 6-8)

### Objectives
Build disaster recovery workflows, runtime integrity checks, Super Admin control panel, and comprehensive documentation.

| Day | Task | Files | Effort |
|-----|------|-------|--------|
| 20 | License transfer request/approve/reject | `endpoints/admin.py`, `services/license_service.py` | 6h |
| 21 | Emergency access code system | `services/emergency_service.py` (NEW) | 6h |
| 22 | Backup restore endpoint | `endpoints/backup.py`, `services/backup_service.py` | 6h |
| 23 | Runtime integrity checks (6h interval) | `core/integrity.py`, background task | 4h |
| 24 | Super Admin anti-piracy dashboard | Frontend pages, API endpoints | 8h |
| 25 | Runtime monkey-patch detection | `core/tamper_detect.py` (NEW) | 4h |
| 26 | Tamper response system (auto-suspend) | `core/tamper_detect.py`, `services/license_service.py` | 4h |
| 27-28 | Documentation + testing | All docs/security/ files, test suite | 16h |

**Gate:** Full disaster recovery flow tested (backup → new server → restore → verify).

**Risk:** Emergency codes printed may be lost — store half in Super Admin vault, half with school.

### Deliverables
- ✅ Server replacement workflow
- ✅ Emergency access with 24h codes
- ✅ Backup encryption + signing + restore
- ✅ Runtime integrity checks active
- ✅ Super Admin anti-piracy dashboard
- ✅ All 10 security documents finalized

---

## Detailed Timeline

```mermaid
gantt
    title ZENOVA Security Implementation Roadmap
    dateFormat  YYYY-MM-DD
    
    section Phase 1 — Foundation
    Compile coreval.c           :a1, 7d
    Deploy license server       :a2, 3d
    gen-license-keys.py         :a3, 1d
    Watermark + honeytokens     :a4, 2d
    
    section Phase 2 — Detection
    IP/Geo logging              :b1, 2d
    Multi-install detection     :b2, 3d
    Alerting service            :b3, 2d
    License audit events        :b4, 2d
    File integrity monitor      :b5, 2d
    
    section Phase 3 — Hardening
    Docker hardening            :c1, 3d
    Backend obfuscation         :c2, 3d
    Frontend obfuscation        :c3, 2d
    Backup encryption           :c4, 2d
    Image signing               :c5, 1d
    
    section Phase 4 — Resilience
    License transfer            :d1, 3d
    Emergency access            :d2, 2d
    Backup restore              :d3, 2d
    Runtime integrity           :d4, 2d
    Super Admin dashboard       :d5, 3d
    Documentation + tests       :d6, 3d
```

## Resource Estimates

| Phase | Duration | Backend | Frontend | DevOps | Total |
|-------|----------|---------|----------|--------|-------|
| Phase 1 | 5 days | 2 devs | 0 | 1 dev | 15 person-days |
| Phase 2 | 7 days | 2 devs | 0.5 dev | 0.5 dev | 21 person-days |
| Phase 3 | 7 days | 1 dev | 1.5 devs | 1 dev | 24 person-days |
| Phase 4 | 9 days | 2 devs | 1 dev | 0.5 dev | 31 person-days |
| **Total** | **8 weeks** | **7 devs** | **3 devs** | **3 devs** | **91 person-days** |

## Success Criteria

### Security Score Targets
| Metric | Current | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|---------|
| Overall security score | 47/100 | 60/100 | 72/100 | 82/100 | 90/100 |
| Critical vulnerabilities | 7 | 2 | 0 | 0 | 0 |
| High vulnerabilities | 10 | 5 | 2 | 0 | 0 |
| MFA adoption | 0% | 0% | 0% | 0% | 100% |
| Test coverage (security) | 5% | 30% | 50% | 70% | 85% |

### Functional Success Criteria
- [ ] `.lic` file validation blocks unlicensed installs
- [ ] Hardware fingerprint change triggers review mode
- [ ] Multi-installation from different cities auto-alerts
- [ ] Docker images contain no raw source code
- [ ] Backend code obfuscated (PyArmor)
- [ ] Frontend JS obfuscated (javascript-obfuscator)
- [ ] Backup encryption + signing operational
- [ ] Server replacement workflow tested and documented
- [ ] Emergency access system functional
- [ ] Super Admin can revoke any license remotely
- [ ] All audit events captured and alertable
- [ ] Full recovery cycle tested (backup → restore → verify)

## Appendix: Dependency Graph

```
coreval.c compilation
  └─ depends on: gcc/MinGW + OpenSSL headers
  └─ blocked by: missing build tools

Cloud license server
  └─ depends on: FastAPI instance at superadmin.free.nf
  └─ blocked by: domain DNS + server provisioning

Multi-install detection
  └─ depends on: IP logging in validation
  └─ blocked by: nothing

Backend obfuscation
  └─ depends on: PyArmor license purchase
  └─ blocked by: budget approval

Backup encryption
  └─ depends on: backup_key generation
  └─ blocked by: nothing

License transfer
  └─ depends on: cloud license server
  └─ blocked by: Phase 1 completion
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| C compilation fails on some platforms | Medium | High | Pure-Python fallback with alert |
| PyArmor breaks dynamic code | Medium | High | Comprehensive route testing |
| Geo-IP service unreliable | Low | Medium | Offline fallback (hostname) |
| Super Admin unresponsive during emergency | Low | High | 24h auto-approve with audit |
| Users resist MFA | Medium | Low | Phased rollout, grace period |
| Backup key lost | Low | Critical | Key escrow in Super Admin vault |
