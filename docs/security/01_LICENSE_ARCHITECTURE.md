# License Architecture

## Overview

ZENOVA uses a multi-layered license system with RSA-PSS signed `.lic` files, hardware fingerprint binding, 256-bit activation keys, cloud validation, and a 45-day offline grace period. The system supports MAIN (school), BRANCH (campus), and SUPER_ADMIN license types.

## Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │    Cloud License Server      │
                    │  superadmin.free.nf          │
                    │                              │
                    │  POST /license/verify        │
                    │  POST /license/revoke        │
                    │  POST /license/renew         │
                    │  GET  /license/ping          │
                    └───────────┬─────────────────┘
                                │ HTTPS + HMAC
                    ┌───────────▼─────────────────┐
                    │     School Server (Local)    │
                    │                              │
                    │  ┌─ Startup Validation ───┐  │
                    │  │ 1. Check .lic file      │  │
                    │  │ 2. RSA signature verify │  │
                    │  │ 3. Check expiry         │  │
                    │  │ 4. Hardware fingerprint │  │
                    │  │ 5. Cloud validation     │  │
                    │  │ 6. Cache in Redis       │  │
                    │  └────────────────────────┘  │
                    │                              │
                    │  ┌─ Runtime Validation ───┐  │
                    │  │ Every 24h: re-check     │  │
                    │  │ Feature gating on       │  │
                    │  │ NFC/QR/Import/ID Card   │  │
                    │  └────────────────────────┘  │
                    └──────────────────────────────┘
```

## Existing Implementation

### License Types (4)
| Type | Duration | Use |
|------|----------|-----|
| TRIAL | Time-limited | Evaluation |
| MONTHLY | 30 days | Short-term |
| YEARLY | 365 days | Standard |
| LIFETIME | No expiry | Perpetual |

### License Statuses (4)
`ACTIVE` → `EXPIRED` → `SUSPENDED` → `REVOKED`

### Key Format (V2)
`ZNV-{M|B|O|T}-{base58(32 bytes)}-{CRC32}`

- Prefix `ZNV-` identifies ZENOVA
- Second segment: `M`=MAIN, `B`=BRANCH, `O`=OEM, `T`=TRIAL
- 32 bytes of cryptographically secure random data
- Base58 encoded (no 0/O/I/l ambiguity)
- CRC-32 checksum appended for typo detection

### Key Generation (`license_service.py`)
```python
def generate_v2_key(license_type: str) -> str:
    prefix = {"MAIN": "M", "BRANCH": "B", "TRIAL": "T"}.get(license_type, "O")
    random_bytes = secrets.token_bytes(32)  # 256 bits
    encoded = base58encode(random_bytes)
    crc = crc32(prefix + encoded) & 0xFFFFFFFF
    checksum = base58encode(crc.to_bytes(4, 'big'))
    return f"ZNV-{prefix}-{encoded}-{checksum}"
```

### RSA-PSS Signed `.lic` Files
- Vendor generates RSA-2048 key pair
- Private key kept offline/HSM
- Public key embedded in `app/licensing/public_key.py`
- License file is JSON payload signed with RSA-PSS + SHA-256
- Stored at: `/etc/zenova/license.lic` (Linux), `C:\ProgramData\Zenova\license.lic` (Windows)

### `.lic` File Structure
```json
{
  "school_id": "uuid",
  "school_name": "School Name",
  "machine_fingerprint": "sha256hash",
  "license_type": "MAIN",
  "valid_from": "2026-01-01",
  "valid_until": "2026-12-31",
  "max_students": 5000,
  "max_branches": 3,
  "features": ["nfc", "qr", "import", "id_card"],
  "issued_at": "2026-01-01T00:00:00Z",
  "signature": "<base64 RSA-PSS signature>"
}
```

### Feature Locking
```python
# Applied to endpoints via FastAPI dependency
require_licensed_feature("nfc")      # NFC attendance
require_licensed_feature("qr")       # QR code scanning
require_licensed_feature("import")  # Excel/CSV import
require_licensed_feature("id_card") # ID card printing
```

### C Extension Anti-Monkey-Patch
`licensing/coreval.c` is a 198-line C module that:
- Embeds the RSA public key at compile time
- Verifies license file signatures using OpenSSL
- Returns `0` (valid) or `-1` (invalid)
- Resists Python-level monkey-patching

**Status:** Source exists. NOT compiled. Needs `gcc`/`MinGW` build.

## Gaps & Implementation Plan

| Gap | Severity | Effort | Status |
|-----|----------|--------|--------|
| Cloud license server not deployed | Critical | 3 days | ❌ |
| gen-license-keys.py script missing | High | 1 day | ❌ |
| C extension not compiled | High | 1 day | ❌ |
| No floating/concurrent licensing | Medium | 3 days | ❌ |
| No feature-based license tiers | Medium | 2 days | ❌ |
| No trial key auto-expiry | Low | 1 day | ❌ |
| No subscription billing integration | Low | 5 days | ❌ |

## Implementation Recommendations

1. **Deploy cloud license server** at `superadmin.free.nf` using the existing `license-server/` code
2. **Create `gen-license-keys.py`** that generates RSA key pairs and signs `.lic` files
3. **Compile `coreval.c`** to `.pyd`/`.so` using the existing `build-coreval.py`
4. **Add floating license support** with concurrent user tracking in Redis
5. **Define feature tiers** (Basic/Standard/Enterprise) mapping to feature flags
6. **Auto-expire trial keys** via a background job
7. **Integrate subscription billing** (Chapa recurring payments for license renewal)

## Rollback Instructions

- Revert `license_service.py` to V1 key format if V2 has issues
- Remove `.lic` file and restart to fall back to DB-only validation
- Set `ENVIRONMENT=dev` to bypass production license checks
