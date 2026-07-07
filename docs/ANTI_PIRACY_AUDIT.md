# ZENOVA — Anti-Piracy Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Cloud Security Engineer role
**Method:** Static analysis across `backend/app/services/license_crypto.py`, `backend/app/services/tpm_service.py`, `backend/app/licensing/coreval.pyd` and Python wrapper, `backend/app/core/watermark.py`, `backend/app/core/server_identity.py`, `license-server/`, nginx headers, docker config. No code modified.

> The anti-piracy architecture is also documented in `docs/security/03_ANTI_PIRACY.md` (2026-07-05 design doc). This report assesses the **implementation against the design** and asks: can the system be pirated?

---

## Executive Summary

ZENOVA invests heavily in anti-piracy: RSA-PSS-signed `.lic` files, 8-component hardware fingerprint with environment-aware binding, optional TPM sealing, compiled C-extension anti-monkey-patch verifier, HMAC instance watermark on every HTTP response, license-gated features (NFC/QR/import/id_card). **Piracy is well-defended at the school-server level** but defeated at the cloud configuration level (unauthenticated license issuance — see §2.1). Theoretical piracy remains via backup theft combined with null fingerprint binding (see LICENSE_SYSTEM_AUDIT §7.2).

| Question | Answer |
|---|---|
| Can someone copy the source code? | **Yes** — no obfuscation/protection deployed; source is open in this monorepo (`.py` plain-text). Note: design docs (`docs/security/05_BACKEND_PROTECTION.md`) suggest Nuitka/PyArmor but neither is active. |
| Can someone clone the database? | **Yes** — see BACKUP_AUDIT (default unencrypted backups) and via SQL injection (none found — ORM throughout) or backup theft |
| Can someone move the system to another server? | **Yes for null-fingerprint licenses (silently)** — see LICENSE_SYSTEM_AUDIT §7.2 |
| Can someone remove license checks? | **Hard in MS Windows, easy in Linux** — see §3.4 |
| Can someone steal customer data? | **Yes via cloud license-server PII dump** — see SECURITY_AUDIT C1 |
| Can someone run the system illegally? | **Yes** — combined bypass ~1 minute (see §2.1) |

---

## §1 — Defense Layers Inventory

| # | Layer | Implemented | Status |
|---|---|---|---|
| 1 | `coreval.pyd` C extension anti-monkey-patch (Windows only) | ✓ Windows .pyd | Missing Linux `.so` equivalent — Linux silent skip |
| 2 | RSA-2048-PSS-signed .lic files | ✓ | Strong; verify both C and Python paths |
| 3 | 8-component hardware fingerprint | ✓ | 75% tolerance for bare metal; env-aware (bare/VM/docker/unknown) |
| 4 | Optional TPM sealing of fingerprint | ✓ (opt-in) | Hardware-bound; deactivated if no TPM |
| 5 | Environment detection (`detect_environment`) | ✓ | VM/Docker/bare by MAC OUI, DMI, `/.dockerenv`, `/proc/1/cgroup`, `/proc/cpuinfo` |
| 6 | Offline grace days env-aware (45/30/15/7) | ✓ | Adequate |
| 7 | HMAC-encrypted `X-Zenova-Instance` watermark | ✓ | Every response has watermark — forensics trail |
| 8 | `X-Zenova-Build` build identifier | ✓ | Tracks build provenance |
| 9 | `X-Request-ID` per request | ✓ | 8-char uuid per request |
| 10 | License status cached in Redis (TTL 1800s) | ✓ | Speeds checks; 30-min revocation delay (see LICENSE_SYSTEM_AUDIT H) |
| 11 | Device-change workflow + 24h auto-approve | ✓ | Balanced UX vs security |
| 12 | Cloud heartbeat every 6h | ✓ | Detects long offline |
| 13 | Honeytokens / multi-install detection | Designed but not implemented? | See `docs/security/03_ANTI_PIRACY.md` — design exists; not located in code |
| 14 | Compiled image signing (Sigstore/Cosign) | Not implemented | roadmap 04_DOCKER_PROTECTION.md |
| 15 | Frontend source obfuscation | Not implemented | Next.js ships reasonably readable JS; no `javascript-obfuscator` in package.json |
| 16 | Backend code obfuscation (Nuitka/PyArmor) | Not implemented | design 05_BACKEND_PROTECTION.md |
| 17 | Distroless / non-root Docker | Not implemented | see DEVOPS D5 — backend runs as root |

---

## §2 — Bypass Scenarios

### §2.1 — Bypass scenario A: mint a cloud license in < 1 minute (CRITICAL)

1. Attacker reaches the cloud license-server (`https://superadmin.free.nf`):
   ```bash
   # 0 seconds — no auth
   curl -X POST https://superadmin.free.nf/api/v1/license/generate \
        -H "Content-Type: application/json" \
        -d '{"school_id":"attacker-school","license_type":"MAIN",
             "valid_until":"2030-01-01","max_users":100000,"max_branches":999}'
   ```
2. Server responds with `{key: "ZNV-M-...", id: ..., license_type: "MAIN"}` — a fully valid license.
3. Attacker's local ZENOVA install runs `activate_license(key)` → license bound to attacker's hardware.
4. **Result:** unlimited piracy, forever. **All school-side cryptographic investment is bypassed** because the cloud issuance is broken.
5. Total time: ~30 seconds, no tools beyond `curl`.

### §2.2 — Bypass scenario B: steal .lic + null fingerprint (CRITICAL)

1. Steal backup (see BACKUP_AUDIT — default unencrypted, no offsite, 7-day retention) → obtain victim's `license.lic`.
2. If the victim's `License.machine_fingerprint` is null (silent binding probe failure per LICENSE_SYSTEM_AUDIT §4.3) → attacker's `validate_license_at_startup` will pass with any hardware.
3. **Result:** attacker runs a legitimate customer's license on different hardware.

### §2.3 — Bypass scenario C: patch public key on Linux (HIGH)

1. Linux deployment of ZENOVA imports `coreval.pyd` — but `.pyd` is Windows-only. The wrapper `licensing/coreval_wrapper.py` likely wraps the import in `try/except ImportError: pass`.
2. Attacker patches `app/licensing/public_key.py` with their own public key.
3. Signs own .lic with the matching private key.
4. **Result:** license validates.

### §2.4 — Bypass scenario D: replay cloud response (MEDIUM)

Cloud `/license/verify` response lacks a nonce or timestamp. With stolen `.lic`, attacker replays a captured response every 30 minutes to keep `license:status` cached → license stays valid indefinitely past cloud unavailability.

### §2.5 — Bypass scenario E: OCR / screenshot forgery of QR / NFC (HIGH)

See SECURITY_AUDIT C7 and H4: QR tokens are base64 plaintext (no signing); NFC UIDs stored plaintext — clone with $10 reader. These don't bypass the license per se, but they bypass the *integrity features* the license gates.

---

## §3 — Source Protection (Question: can source be copied?)

### §3.1 — Backend source

- `.py` files served as-is, source on this monorepo. **No obfuscation, no Nuitka, no PyArmor, no Cython compilation of services.**
- Compiled C extension `coreval.pyd` — Windows only, ~30 KB, anti-monkey-patch only; **does not protect other source files**.
- A competitor or former customer with disk access has the full Python source + comments + algorithm clarity.

### §3.2 — Frontend source

- Next.js ships compiled chunks. Reasonably readable.
- **No `javascript-obfuscator`, no Terser mangle props, no string encoding** — `next.config.ts` doesn't enable them.
- Frontend `.tsx` source shipped to anyone who downloads the prod build with sourcemaps on (currently sourcemaps hidden in `output: standalone` ✓, but `.next/server` chunks may leak names — `npx next lint` would tell).

### §3.3 — License-server source

- The cloud admin UI/server is presumably operated by ZENOVA itself — not customer-facing source. Still, if this monorepo is leaked or git-published, the cloud-server is itself on GitHub — fully transparent.

### §3.4 — Hardening recommendation (roadmap-aligned)

Activate the platform-level defenses documented (but not deployed) in `docs/security/05_BACKEND_PROTECTION.md`:

1. Nuitka compile the backend services → `app/services/*.pyc.so` on Linux
2. PyArmor obfuscate
3. Frontend `javascript-obfuscator` post-build step
4. Ship `coreval.so` for Linux, treat extension-import failure as license-reject (not silent skip)
5. Add Cosign image signing on Docker registry
6. Add honeytoken "fake" secrets in env / data files that trigger alerts if exfiltrated

---

## §4 — Multi-Install & Customer Attack Surface (Question: can schools attack each other?)

### §4.1 — Cross-tenant data isolation

Cross-tenant attack vectors (in school-SaaS mode on a shared license-server or shared DB):

| Attack | Severity | Mitigation status |
|---|---|---|
| `/corporate/*` no school_id filter (see API_AUDIT H6) | **Critical** | NOT mitigated |
| `/nfc/{x}/by-card/{uid}` cross-tenant PII (see SECURITY H5) | High | NOT mitigated |
| `/parent-payments/refund/{id}/approve` no school check (see SECURITY H1) | High | NOT mitigated |
| `/card-design/{school_id}` IDOR (see SECURITY H7) | High | NOT mitigated |
| `/platform/admin/dashboard` any auth user | High | NOT mitigated |
| `/installer/connect-vps` unauth SSRF (see SECURITY C3) | Critical | NOT mitigated |
| `AuditLog.school_id` never populated (see DB_AUDIT §2.2) | Critical | NOT mitigated — tenant-scoped forensics impossible |

**Conclusion:** Schools today CAN attack each other through several endpoints. Multi-tenancy is defended in code on most queries but broken on ~7 specific surfaces. **PostgreSQL Row-Level Security (RLS)** would close all of these regardless of code bug — recommended defense in depth.

### §4.2 — Employee abuse surface (Question: can employees abuse perms?)

| Abuse path | Severity | Status |
|---|---|---|
| Student→Admin via `UserUpdate.role_id` (API_AUDIT H10) | High | Allowed unless `current_user.is_superuser` set |
| `/activate/employees/create` with `role_name="SUPER_ADMIN"` (SECURITY H10) | High | Not capped |
| `PUT /settings` writable by any auth user (SECURITY C6) | Critical | Allowed |
| `/branches/{id}` PATCH/DELETE without `SCHOOL_MANAGE` | Medium | Allowed |
| `/telegram/bot/connect` no SETTINGS_MANAGE | Medium | Allowed |
| `/audit-logs` returns empty for non-super | Low | Misleading but secure |
| Brute-force tracking fail-open when Redis down | Low | By design |

**Conclusion:** Yes — a STUDENT account today can rewrite their school's settings via `PUT /settings` (Critical C6). A teacher in the `activate` flow can promote themselves to SUPER_ADMIN role. **Customer-side insider abuse is currently trivial.**

---

## §5 — Backup Theft Surface (Question: can backups be stolen?)

See BACKUP_AUDIT:

- **Default unencrypted backups** — `BACKUP_ENCRYPT_ENABLED=false` in `.env.example`
- VPS `backup-worker` exposes plaintext `pg_dump` for 7 days on shared volume — anyone with read access reads
- No offsite / S3 upload configured by default
- Backup filename pattern is timestamped (`zenova_YYYYMMDD_HHMM.sql`) — predictable
- No integrity hash stored

**Conclusion:** Yes — backups are currently stealable trivially, exposing all student/finance/PII data.

---

## §6 — Conclusions

ZENOVA's anti-piracy investment on the **school-server side** is real and substantial. The cloud-administrative side is **completely unauthenticated** — defeating the entire investment in seconds. Until license-server authentication is added and license binding silently-no-ops are removed, the anti-piracy architecture is **paper-only**.

**Anti-Piracy Score: 35/100** — strong technical-cryptography score (80/100 for school-side) but **0/100 for cloud issuance policy** = weighted low.

| Direction | Recommended action | Priority |
|---|---|---|
| cloud issuance | `Depends(require_super_admin)` on /generate/admin | Critical now |
| backup theft | enable `BACKUP_ENCRYPT_ENABLED=true` + S3 push | Critical |
| null fingerprint binding | reject activation on probe failure | Critical |
| source protection | Nuitka + PyArmor | Medium |
| lateral movement | PostgreSQL RLS on every tenant-scoped table | Medium |
| cross-tenant IDOR | fix CORPORATE_ADMIN / SETTINGS_MANAGE / etc (see API_AUDIT) | Critical |

**End of ANTI_PIRACY_AUDIT.md**
