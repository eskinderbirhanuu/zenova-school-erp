# ZENOVA — License System Audit

**Date:** 2026-07-06
**Auditor:** GLM-5.2 — Senior Backend Security Engineer role
**Method:** Static analysis of `backend/app/licensing/`, `backend/app/services/license_*.py`, `backend/app/api/v1/endpoints/licenses.py`, `activate.py`, `installer.py`, `license-server/`. No code modified.

> Section reference: SECURITY_AUDIT.md C1, C2, H11; ANTI_PIRACY_AUDIT.md.

---

## Executive Summary

ZENOVA's license system is **cryptographically sophisticated on the school side** (RSA-PSS-signed `.lic` files, 8-component hardware fingerprint with environment-aware binding, 75% tolerance, optional TPM sealing, anti-monkey-patch compiled C extension `coreval.pyd`, 256-bit V2 keys) but **trivially defeatable on the cloud side** (license-server's `/generate` route is unauthenticated, an attacker can mint unlimited licenses; `/auth/school/login` accepts any known email with no password; cloud-generated key entropy is only 64-bit). The license system, in production today, **provides ~zero effective protection** because the cloud — the source of all license keys — has no auth.

| Score | Layer | Notes |
|---|---|---|
| 85/100 | School-side validation | RSA-PSS, hardware fingerprint, TPM, anti-tamper |
| 75/100 | Device binding & grace | 75% tolerance env-aware; fingerprint-binding silently no-ops on probe failure |
| **20/100** | Cloud server | Unauthenticated issuance is fatal |
| 60/100 | Revocation | Status flip works, but no cache-busting push |
| 50/100 | Operational | No audit on recovery-code issue; no forensic snapshot |

---

## §1 — License Key Formats

| Format | Pattern | Entropy | Generation | Status |
|---|---|---|---|---|
| **V2 (current)** | `ZNV-{M\|B\|O\|T}-{base58(32 bytes)}-{CRC32 hex}` | **256-bit** | Local `generate_license_key_v2` (`license_service.py:43`) using `secrets.token_bytes(32)` | ✓ Strong |
| **Legacy V1** | `ZNV-XXXX-XXXX-XXXX-XXXX` (4× hex) | **64-bit** | Historical / still accepted by `verify_license` | Weak, kept for compat |
| **SAL (Super Admin)** | `SAL-XXXX-XXXX-XXXX` | **64-bit** | `generate_sal` similar | Weak |
| **Cloud-generated** | `ZNV-{T}-sha256(...)[0:16]-CRC32` | **64-bit** | `license-server/app/services/license_service.py:13` | **Weak** (H1 below) |

---

## §2 — Signing & Trust Model

### §2.1 — `.lic` file signing (school side)

- Algorithm: **RSA-2048 + PSS / MGF1-SHA256, salt=32** (`license_crypto.py:445-449`)
- Payload: JSON `{version, school_id, school_name, machine_fingerprint, valid_until, created_at}`
- Public key embedded in two layers:
  1. `backend/app/licensing/public_key.py` — Python PEM (922 bytes)
  2. Compiled C extension `coreval.pyd` carries the same key as `embedded_key.h` — anti-monkey-patch resilience

### §2.2 — Anti-monkey-patch C extension (`coreval.pyd`)

- Compiled to `app/licensing/coreval.pyd`, `.lib`, `.exp`, `.c`, `.h`
- Carries embedded public key
- Invoked first by `license_validator.validate_lic_file:93` — if installed and check fails → reject license immediately
- Resistance: anyone who can attach a debugger to the running Python process can patch the loaded `pyd` in memory — raises the bar substantially but not absolute

### §2.3 — School validation flow (`license_crypto.validate_license_at_startup`)

1. `.lic` signature verified by C extension + Python public key (belt + braces)
2. Cloud check first (`POST {license_server_url}/api/v1/license/verify`) → on success, clear `offline_grace_start`; set `last_online_validation`
3. Cloud failure / unreachable → start `offline_grace_start` if null; remaining grace = `env_grace_days - days_since_start`
   - bare_metal: 45d
   - VM: 30d
   - docker: 15d
   - unknown: 7d
4. Past grace → `valid=False`, `restrict_nfc/qr/import/id_card=True`
5. Cache: `setex("license:status", 1800, ...)` — 30-minute Redis TTL

### §2.4 — Cloud-side key generation (`license-server/app/services/license_service.py:13`)

```python
def generate_license_key(school_id, license_type, ...):
    raw = f"{school_id}:{license_type}:{uuid4().hex}:{datetime.now(timezone.utc).isoformat()}"
    key_part = sha256(raw).hexdigest()[:16]   # 64-bit security!
    return f"ZNV-{license_type}-{key_part}-{crc32(...):x}"
```

**Critical:** Cloud-generated keys are 2^192× easier to brute-force than locally minted V2 keys. Any long-lived `/license/verify` endpoint can be hammered.

---

## §3 — Hardware Fingerprint & Device Binding

### §3.1 — 8-component fingerprint (`license_crypto.py`)

1. `mac`
2. `cpu_serial`
3. `machine_id`
4. `disk_serial`
5. `hostname`
6. `os_version`
7. `dmi_uuid`
8. `boot_id`

Hash = `sha256(":".join(component_values))`.

### §3.2 — Environment-aware binding (`license_crypto.py:138-143`)

| Environment | Components used | Grace (days) |
|---|---|---|
| bare_metal | all 8 | 45 |
| VM (`mac OUI for VMware/Hyper-V/VirtualBox/Xen`) | 2 (`machine_id`, `disk_serial`) | 30 |
| Docker (`/.dockerenv`, `/proc/1/cgroup`) | 1 (`machine_id`) | 15 |
| Unknown (`/proc/cpuinfo hypervisor flag`) | 2 (`hostname`, `mac`) | 7 |

### §3.3 — 75% tolerance matching (`match_fingerprint_components`)

- 6 of 8 components must match to pass for bare_metal environment
- VM uses 2 components → both must match
- Docker uses only `machine_id` — losing that one brick the license instantly (no tolerance)

### §3.4 — Hardware change → device change workflow

If components mismatch <75%:
1. `create_device_change_request` invoked
2. License status → `REVIEW_MODE` (read-only, 24h auto-approve) OR `DEVICE_LOCKED` (full restrictions on NFC/QR/import/id_card)
3. Audit logged
4. No automatic cloud callback timeout — admin must REVIEW in cloud dashboard

---

## §4 — Critical License Vulnerabilities

### §4.1 — Cloud license-server issues keys unauthenticated (CRITICAL — see SECURITY C1)

`POST /api/v1/license/generate` — no auth dep. **Anyone mints unlimited license keys for any school.**

### §4.2 — Cloud `/auth/school/login` no password check (CRITICAL — see SECURITY C1)

`POST /api/v1/auth/school/login` (`auth.py:42-49`) accepts any email that exists in `schools` table with **no password verification**. → JWT issuance to any email-known attacker. → Impersonation of any school on the license-server.

### §4.3 — License binding silently no-ops on hardware probe failure (CRITICAL)

`activate_license` (`license_service.py:130`) → `bind_license_to_hardware` → wraps each probe in `try/except`. If all probes fail (e.g., wmic timeout on Windows), `License.machine_fingerprint` stays `null`. Then `validate_license_at_startup` skips the fingerprint compare (`if license.machine_fingerprint:`).

Cloud verify (`license-service.py:80`):
```python
if lic.machine_fingerprint and lic.machine_fingerprint != machine_fingerprint:
    reject()
# if stored fingerprint is empty/None, SETS it from the request without challenge
lic.machine_fingerprint = machine_fingerprint
```

**Risk:** Any device can rebind by submitting its own fingerprint as the "new" first value. **Effectively defeats device binding.**

**Fix:**
- `activate_license` must reject the activation if fingerprint binding failed.
- Cloud must reject `activate`/`verify` calls when stored fingerprint is null AND a fingerprint was already attempted — require explicit "first activation only" flag.
- Cloud should never accept `verify` (no binding mutation) setting the stored fingerprint; only `/activate` may set it once.

### §4.4 — Cloud key entropy 64-bit (HIGH — H11)

Mentioned in §2.4 — cloud keys are 64-bit while local keys are 256-bit.

### §4.5 — No push notification on revocation (HIGH)

When `SUPER_ADMIN` calls `PATCH /licenses/{id}/status` with `SUSPENDED`/`REVOKED`:
- License status flips, cache invalidated **on the cloud**
- The affected school's local cache remains for 30 minutes (`setex("license:status", 1800, ...)`)
- During that window, the school's local validation passes — the revocation is invisible locally for ~30 min

**Risk:** A compromised license can be used for 30 minutes after revocation. Mitigation: push-notification over WebSocket / webhook from cloud → school invalidates its Redis key immediately.

### §4.6 — Recovery code issue action not audited (MEDIUM)

`POST /activate/recovery/issue` (`activate.py:295`) issues a recovery code but only logs `RECOVERY_ISSUED` on the **reset** path — issuing is not logged. Forensics blind to "who requested the recovery code" without server logs.

### §4.7 — License.key column doesn't enforce entropy at DB schema level (LOW)

License keys are unique (DB constraint) but no length/pattern constraint. A mistyped key can be inserted manually.

### §4.8 — `License.machine_fingerprint` nullable + no `NOT NULL` guarantee (CRITICAL)

Mentioned in §4.3 — column is nullable on schema. Combined with silent binding failure, makes device binding optional.

---

## §5 — License Endpoints (`licenses.py` + `activate.py` + `installer.py`)

| # | Route | Auth | Rate-limited | Verdict |
|---|---|---|---|---|
| 1 | `POST /licenses/verify` | Public | LICENSE_VERIFY_LIMIT 20/5min | ✓ |
| 2 | `GET /licenses/status/current` | any auth user | Global 200/min | OK |
| 3 | `POST /licenses/activate` | `LICENSE_MANAGE` | Act_INIT_LIMIT | ✓ |
| 4 | `GET /licenses` | `LICENSE_MANAGE` | OK | ✓ |
| 5 | `GET /licenses/{id}` | `LICENSE_MANAGE` | OK | ✓ |
| 6 | `POST /licenses` | `LICENSE_MANAGE` | OK | ✓ |
| 7 | `PATCH /licenses/{id}/status` | `LICENSE_MANAGE` | OK | ✓ |
| 8 | 5 device-change routes | `LICENSE_MANAGE` + `DEVICE_REVIEW` | OK | ✓ |
| 9 | `POST /activate/recovery/issue`, `/recovery/reset`, `/verify-super-admin-contact` | Public | RECOVERY_ISSUE_LIMIT 10/15min; RESET_PASSWORD_LIMIT 5/15min; AUTH_RATE_LIMIT | ✓ |
| 10 | `POST /installer/connect-vps`, `/initialize-*` | **Public** | **No rate limit** | **Critical C3** (SECURITY) — also SSRF |

---

## §6 — Anti-Piracy Defenses Inventory (cross-ref ANTI_PIRACY_AUDIT.md)

| Defense | Layer | Status |
|---|---|---|
| Compiled C extension `coreval.pyd` with embedded public key | License signature verification | ✓ Present |
| RSA-2048-PSS .lic files | License | ✓ Present |
| 8-component hardware fingerprint | Device binding | ✓ Present |
| Environment-aware binding (bare/VM/docker) | Device binding | ✓ Present |
| 75% tolerance matching | Device binding | ✓ Present |
| Optional TPM sealing | Device binding | ✓ Present (opt-in) |
| HMAC instance watermark on every response (`X-Zenova-Instance`) | Forensics | ✓ Present |
| Honeytokens / multi-install detection | Anti-piracy | Not audited in detail — see `docs/security/03_ANTI_PIRACY.md` |
| Image base: distroless / non-root | Container | ✗ NOT applied (see DEVOPS D5) |
| Nuitka/PyArmor code obfuscation | Backend | NOT applied per `security/05_BACKEND_PROTECTION.md` roadmap |
| Frontend obfuscation | Frontend | NOT applied — Next.js serves reasonably readable JS |
| File integrity monitoring | Tamper | NOT audited — see `docs/security/07_TAMPER_DETECTION.md` |

---

## §7 — License Bypass Vectors

### §7.1 — Practical bypass 1: mint a cloud key

1. Attacker: `curl -X POST https://superadmin.free.nf/api/v1/license/generate -d '{"school_id":"victim-school","license_type":"MAIN","valid_until":"2030-01-01","max_users":100000,"max_branches":999}'`
2. Server returns a valid `key`.
3. Attacker runs `license_service.activate_license(key)` on their own server → license bound to their hardware.
4. Done — they now have a valid, unrestricted, perpetual license for any school. **Cloud auth absent → bypass takes < 1 minute.**

### §7.2 — Practical bypass 2: theft of `.lic` + null fingerprint

1. Steal the victim's `license.lic` (e.g., backup theft — see BACKUP_AUDIT).
2. If the victim's license had a null `machine_fingerprint` (which happens silently per §4.3), the attacker's `validate_license_at_startup` will pass with any hardware.
3. Done.

### §7.3 — Practical bypass 3: replay

1. Steal `.lic` + watch one legitimate `/license/verify` HTTP call to the cloud.
2. Replay the cloud response locally (no nonce / timestamp binding in the cloud's response).
3. The school's local cache `setex("license:status", 1800, ...)` re-applies — license stays valid for 30 minutes per replay.
4. Not a permanent bypass but extends window indefinitely.

### §7.4 — Practical bypass 4: mutable public key

1. The Python public key is in `app/licensing/public_key.py`. Patch it to an attacker-controlled key; sign own .lic with the matching private key.
2. The C extension `coreval.pyd` embeds the same key — Python-layer patching won't fool it.
3. But the C extension is a MS Windows `.pyd`. On Linux deployments, the import is wrapped in try/except (silent skip). **An attacker running Linux can patch only the Python public key and pass.**

**Fix:** ship `coreval.so` for Linux as well; treat extension-import failure as license-reject signal, not skip.

---

## §8 — Recommendations (Priority Order)

| # | Severity | Action |
|---|---|---|
| 1 | Critical | Add `Depends(require_super_admin)` to cloud `/license/generate`, `/admin/*`, `/schools/*` |
| 2 | Critical | Rewrite `/auth/school/login` to require bcrypt password (never email-only) |
| 3 | Critical | `activate_license` MUST reject if `bind_license_to_hardware` failed (fingerprint null) |
| 4 | Critical | Cloud `verify` must NEVER set `machine_fingerprint` — only `activate` may, once, and only if currently null AND first-activation flag set |
| 5 | High | Cloud `generate_license_key` use `secrets.token_bytes(32)` not `sha256(...)[:16]` — match local V2 entropy |
| 6 | High | Push license-revoked webhook to school server → instant Redis invalidation |
| 7 | High | Add per-IP rate limit on cloud `/verify`/`/activate` (currently unlimited) |
| 8 | High | Ship `coreval.so` for Linux; reject .lic if extension absent |
| 9 | Medium | Audit `RECOVERY_ISSUED` on the issue path, not just reset |
| 10 | Medium | Add `key NOT NULL` + `key ~ '^ZNV-[MBOT]-...'` CHECK constraint at DB layer |
| 11 | Medium | Refuse `MASTER_SETUP_KEY` empty in dev compose — current allows unprotected bootstrap |
| 12 | Low | Add license usage analytics (already documented as gap in `docs/audit/15_LICENSE_SYSTEM_GAPS.md`) |
| 13 | Low | Floating / concurrent-user licenses (currently per-device only) |

---

## §9 — Summary

The license system is the project's most labor-intensively-built subsystem — and the most operatively broken due to the cloud endpoint oversight. **Fixing 7 lines of code on the cloud server** (`@router.post("/generate", dependencies=[Depends(require_super_admin)])`) restores the RSA-PSS + 8-fingerprint investment to its design intent.

Without those fixes, the school-side cryptography is decorative.

**License System Score: 55/100** — strong on school-side crypto (85), fully broken on cloud issuance (20), device binding has a backdoor (45).

**End of LICENSE_SYSTEM_AUDIT.md**
