# 10 — LICENSE SYSTEM AUDIT

**Generated:** 2026-07-11
**Tool:** ZENOVA Master Enterprise Audit

---

## Executive Summary

The ZENOVA license system uses RSA-2048 PSS-SHA256 signed `.lic` files, hardware fingerprinting with 8 components and 75% tolerance, environment-aware grace periods (bare_metal=45d, vm=30d, docker=15d), device change review with 24h auto-approval, device locking, TPM support, offline grace mode, cloud license server for verification/activation, and a compiled C extension (coreval.pyd) for anti-tamper. It is one of the most sophisticated components in the codebase. The main gap is the license-server API lacking auth on /verify and /activate endpoints.

**Score:** 8.0/10

---

## Current Implementation

### License Key Format

```
ZNV-{TYPE}-{BASE58_32_BYTES}-{CRC32}

Types:
  M = Main (school server)
  B = Branch
  I = Trial (legacy, deprecated)
  T = Trial (new format)
```

- 256-bit entropy (32 bytes base58-encoded)
- CRC32 checksum for integrity
- v2 format (ZNV-*). Legacy 64-bit format (SAL-XXXX-XXXX-XXXX).

### License File (.lic)

- RSA-2048 signed binary file
- Contains: license key, type, status, valid_from, valid_until, max_users, machine_fingerprint, hardware_id
- Public key embedded in `app/licensing/public_key.py`
- Signature verified using PSS padding with SHA-256

### License Types

| Type | Purpose |
|------|---------|
| SUPER_ADMIN | Platform-level admin server |
| MAIN | Single school main server |
| BRANCH | School branch server |
| TRIAL | 30-day evaluation |
| MONTHLY | Monthly subscription |
| YEARLY | Annual subscription |
| LIFETIME | Permanent license |

### License Statuses

| Status | Description |
|--------|-------------|
| ACTIVE | Normal operation |
| EXPIRED | Validity period ended |
| SUSPENDED | Admin suspension |
| REVOKED | Permanent revocation |
| REVIEW_MODE | Device change detected — under review |
| DEVICE_LOCKED | Suspicious device change — fully locked |

### Hardware Fingerprinting (8 Components)

```
mac, cpu_serial, machine_id, disk_serial,
hostname, os_version, dmi_uuid, boot_id
```

- **75% tolerance**: 6/8 components must match for fingerprint to be considered same device
- **Change categorization**:
  - 1-2 components changed: normal (minor HW change)
  - 3-5 components changed: → REVIEW_MODE (24h auto-approve)
  - 6-8 components changed: → DEVICE_LOCKED (requires manual admin intervention)
- **Component collection**: Platform-specific — Windows uses `wmic`, Linux uses `/sys`, macOS uses `system_profiler`

### Environment Detection

```python
detect_environment() → bare_metal | vm | docker | unknown
```

- **bare_metal**: 8 components, 45-day offline grace
- **vm**: 2 components (mac + machine_id), 30-day grace
- **docker**: 1 component (machine_id), 15-day grace
- **unknown**: 2 components, 7-day grace

### VM Detection

- MAC prefix matching (VMware `00:50:56`, VirtualBox `0a:00:27`, Docker `02:42:ac`, etc.)
- DMI UUID pattern matching (`vmware`, `virtualbox`, `qemu`, `kvm`, etc.)
- `/proc/1/cgroup` for Docker detection
- `/.dockerenv` file check

### Anti-Tamper

1. **coreval.pyd**: Compiled C extension that validates license integrity at C level — harder to debug/reverse than Python
2. **Watermark system**: Forensic watermarks injected into:
   - API responses (`X-Zenova-Instance` header)
   - Seed data (`watermark_seed_data()`)
   - School records (`set_school_watermark()`)
3. **Honeytokens**: License keys designed to detect unauthorized distribution
4. **Runtime checks**: Monkey-patch detection, file integrity monitoring (documented in security docs)

### Offline Mode

- License validated at startup from `.lic` file or DB
- Falls back to DB if `.lic` file invalid
- `offline_grace_start` timestamp tracked
- Grace period based on environment (45d bare_metal, 30d vm, 15d docker)
- `grace_period_enforcer.py` service periodically checks and escalates

### Cloud License Server

- **URL**: `https://superadmin.free.nf` (configurable via `LICENSE_SERVER_URL`)
- **Endpoints**:
  - `GET /api/v1/license/ping` — connectivity check
  - `POST /api/v1/license/verify` — **NO AUTH** — verify license key validity
  - `POST /api/v1/license/activate` — **NO AUTH** — bind license to hardware fingerprint
  - `POST /api/v1/license/generate` — **REQUIRES ADMIN AUTH** — mint new license keys
  - `GET /api/v1/license/school/{school_id}` — list school licenses

### License Server Authentication

- `POST /api/v1/auth/login` — super admin login (email + password)
- `POST /api/v1/auth/school/login` — school login
- JWT-based (HS256) for admin endpoints
- OAuth2PasswordBearer scheme for protected endpoints

### Heartbeat System

- Periodic online validation via `heartbeat_service.py`
- `run_heartbeat_if_due()` connects to license-server `/verify`
- Updates `last_online_validation` timestamp

---

## Strengths

1. **RSA-2048 PSS-SHA256**: Cryptographically sound signing.
2. **8-component hardware fingerprint**: Comprehensive. Covers MAC, CPU, disk, hostname, OS, DMI, boot — diverse identifiers.
3. **75% tolerance**: Allows minor hardware changes (RAM upgrade, NIC replacement) without triggering review.
4. **Environment-aware grace periods**: Different grace periods for bare_metal (45d), vm (30d), docker (15d) — sensible differentiation.
5. **Device review 24h auto-approve**: Reasonable balance between security and user convenience.
6. **TPM support**: `tpm_sealed_data` column for TPM-sealed fingerprint — enhanced binding when available.
7. **C extension anti-tamper**: coreval.pyd compiled from C — harder to reverse than pure Python.
8. **Watermark forensic system**: Instance tracing even if code is exfiltrated.
9. **Offline operation**: Schools can operate without internet for up to 45 days.
10. **Heartbeat service**: Periodic online re-validation.
11. **License generation requires admin auth**: `/generate` endpoint properly gated.

---

## Weaknesses

1. **License-server `/verify` and `/activate` have NO AUTH**: Anyone with network access can verify/activate any license key. These endpoints should require at minimum an API key.
2. **License-server uses SQLite**: Acceptable for low-scale cloud service but less durable than PostgreSQL.
3. **C extension Windows-only**: coreval.pyd is a Windows DLL — no Linux equivalent for Docker deployments.
4. **Public key embedded in source**: Accessible to anyone with source code access. Compiled C extension provides secondary protection.
5. **No license usage metrics**: No tracking of concurrent users or feature usage against license limits.
6. **Device change auto-approval is 24h**: Could approve a stolen device transfer within a day. Should be configurable.
7. **Environment detection is Linux-centric**: `/proc/1/cgroup` and `/sys/class/dmi/` are Linux-only paths. Windows VM detection relies on MAC prefix only.

---

## Issues

### High

| # | Issue | Location | Detail |
|---|-------|----------|--------|
| H1 | License-server /verify, /activate no auth | license-server licenses.py:24,37 | Anyone can verify/activate. Should require API key or JWT |

### Medium

| # | Issue | Detail |
|---|-------|----------|--------|
| M1 | SQLite on license-server | Less durable. Acceptable for low scale but should be PostgreSQL for production |
| M2 | C extension Windows-only | No Linux anti-tamper layer for Docker deployments. Python-only validation in Docker |
| M3 | Environment detection Linux-centric | VM detection fails on Windows for some hypervisors (MAC-based only) |
| M4 | No license usage metrics | Max users not enforced at runtime. No concurrent user tracking |

### Low

| # | Issue | Detail |
|---|-------|----------|--------|
| L1 | License-server secrets in config.py | Hardcoded `super_admin_email="super@zenova.app"`, `super_admin_password="change-me"` |
| L2 | License-server no rate limiting | Verify/activate endpoints not rate-limited — could be abused |
| L3 | Device review auto-approval not configurable | 24h hardcoded. Should be env-configurable |
| L4 | coreval.obj loose at root | C object file at workspace root — should be in `licensing/` |
| L5 | 21 except-Exception clauses in license_crypto.py | Acceptable for resilience but masks specific crypto failures |

---

## Recommended Improvements

1. **HIGH: Add auth to license-server /verify, /activate** — Require API key header (`X-License-Server-Key`) or JWT. Simple middleware. Low effort.
2. **MEDIUM: Migrate license-server to PostgreSQL** — For production durability. Medium effort.
3. **MEDIUM: Add license usage tracking** — Concurrent user count vs max_users. Medium effort.
4. **MEDIUM: Cross-platform VM detection** — Windows: check registry (`HKLM\SYSTEM\...\BIOS` for hypervisor), WMI queries. Medium effort.
5. **LOW: Add rate limiting to license-server** — Prevent abuse of verification endpoint. Low effort.
6. **LOW: Make license-server credentials configurable** — Via env vars instead of hardcoded values. Low effort.
7. **LOW: Compile coreval for Linux** — Build `.so` equivalent for Docker deployments. Medium effort.

---

## Estimated Difficulty

| Fix | Difficulty | Risk |
|-----|-----------|------|
| License-server auth | Low | Low |
| License-server PostgreSQL | Medium | Low |
| Usage tracking | Medium | Medium |
| Cross-platform VM detection | Medium | Low |
| Linux C extension | High | Low |

---

## Priority

| Priority | Item |
|----------|------|
| P0 (now) | License-server endpoint auth |
| P1 (soon) | License-server PostgreSQL migration |
| P2 (later) | Usage tracking, cross-platform VM detection |
| P3 (later) | Linux C extension, rate-limiting |

---

## Production Readiness: License

**Ready with caveats.** The core license crypto and device binding are production-grade. The cloud license-server auth gap is the main concern — anyone could verify/activate keys without auth in the current deployment. This should be resolved before deploying the license server to production.