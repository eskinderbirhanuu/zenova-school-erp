# Anti-Piracy

## Overview

Multi-layered anti-piracy strategy combining forensic watermarking, honeytoken tracking, multi-installation detection, and legal deterrents. No single layer is sufficient — defense in depth ensures piracy is expensive, detectable, and traceable.

## Threat Model

| Attacker | Capability | Primary Risk |
|----------|-----------|--------------|
| School admin | Has license key, can access server | License sharing |
| IT staff | Root access, can copy Docker images | Source code theft |
| Competitor | Purchase single license, reverse engineer | IP theft |
| Pirate | Downloads leaked copy, redistributes | Mass piracy |
| Insider | Has credentials, can exfiltrate data | Data theft |

## Layer 1 — Forensic Watermarks

### 8 Watermark Locations

| # | Location | Method | Detection |
|---|----------|--------|-----------|
| 1 | `backend/.env` | `SCHOOL_WATERMARK` env var | Grep .env file |
| 2 | Frontend JS bundle | `window.__ZENOVA_SCHOOL__` global | Inspect browser console |
| 3 | Database seed data | Unique honeytoken student/parent records | Search DB for specific names |
| 4 | License key | Public key encodes school code | Decode key |
| 5 | API response header | `X-Zenova-Instance` (AES-GCM encrypted) | Inspect HTTP headers |
| 6 | Docker image label | `LABEL zenova.school="schoolname"` | `docker inspect` |
| 7 | Database column name | Decoy column in `schools` table | Check schema |
| 8 | QR code on login page | Tiny dot pattern watermark | QR decode |

### X-Zenova-Instance Header

```python
# middleware in main.py
@app.middleware("http")
async def add_watermark_header(request, call_next):
    response = await call_next(request)
    school = get_school_watermark()
    encrypted = aes_gcm_encrypt(school, settings.WATERMARK_KEY)
    response.headers["X-Zenova-Instance"] = base64.b64encode(encrypted)
    response.headers["X-Zenova-Build"] = settings.BUILD_ID
    response.headers["X-Request-ID"] = str(uuid.uuid4())
    return response
```

### Implementation Status
- ✅ X-Zenova-Instance header middleware is active
- ✅ Default watermark is `"dev"` (no forensic value)
- ❌ Per-school watermark injection never called
- ❌ AES-GCM encryption uses placeholder key

## Layer 2 — Honeytoken Registry

### Honeytoken Records
Each school gets unique seed data inserted at activation:

| Record Type | Count | Example |
|------------|-------|---------|
| Fake students | 3-5 | `"Honey_Abebe_{school_code}"` |
| Fake parents | 1-2 | `"Honey_Kebede_{school_code}"` |
| Fake invoices | 1-2 | `INV-HONEY-{school_code}` |
| Fake ISBN | 1 | `978-{school_code}-HONEY` |

### Tracing Flow
```
1. Pirated copy discovered
2. Check JS bundle → window.__ZENOVA_SCHOOL__
3. Check Docker image → LABEL zenova.school
4. Check API response → X-Zenova-Instance (decrypt)
5. Check DB dump → search honeytoken names
6. Match against HONEYTOKEN_REGISTRY
7. Identify source school
8. Revoke license, legal notice, blacklist
```

### Registry Data Structure
```python
HONEYTOKEN_REGISTRY: dict[str, dict] = {
    "school_uuid_1": {
        "school_name": "School A",
        "students": ["Honey_Abebe_ABC123", ...],
        "parents": ["Honey_Kebede_ABC123", ...],
        "invoice_prefix": "INV-HONEY-ABC123",
    },
    # ...
}
```

### Implementation Status
- ✅ Honeytoken registry dictionary exists
- ✅ `watermark_seed_data()` function written
- ✅ `identify_school_from_honeytoken()` function written
- ❌ `watermark_seed_data()` never called from any endpoint
- ❌ Honeytoken data lost on server restart (in-memory only)

## Layer 3 — Multi-Installation Detection

### Detection Methods

| Method | How It Works | False Positive Risk |
|--------|-------------|---------------------|
| IP Geolocation | Same license seen from different cities | VPN/proxy use |
| License server ping | License server records source IP per validation | NAT (all schools in same city) |
| Sync endpoint | VPS records unique server_id per school | Legitimate reinstall |
| Timestamp analysis | Same key used at overlapping times | Timezone confusion |
| Feature usage pattern | Different usage patterns from same key | Different admin behavior |

### Algorithm
```python
SUSPICIOUS_THRESHOLDS = {
    "different_cities": 2,     # 2+ cities = suspicious
    "different_countries": 1,   # 1+ different country = violation
    "concurrent_sessions": 3,   # 3+ active at same time = violation
    "rapid_reactivation": 5,    # 5+ activations in 24h = violation
}
```

### Response
| Detection | Action | Severity |
|-----------|--------|----------|
| Different city | Flag, notify Super Admin | Low |
| Different country | Auto-suspend, notify | Critical |
| Concurrent sessions > 3 | Audit, warn, then suspend | High |
| Rapid reactivation > 5 | Lock license for 24h | Medium |

### Implementation Status
- ❌ No multi-installation detection exists
- ❌ No IP/geo tracking on license validation
- ❌ No concurrent session tracking

## Layer 4 — Legal Protections

### License Agreement Terms
```
ZENOVA Software License Agreement

1. No redistribution — License is per-installation, non-transferable
2. No resale — License cannot be sold, rented, or sublicensed
3. No reverse engineering — Decompilation, disassembly prohibited
4. No unauthorized modification — Source code modification forbidden
5. No removal of copyright notices
6. No benchmarking disclosure without consent
7. Compliance audits — Licensor may audit usage annually
8. Termination — Automatic on violation, no refund
9. Indemnification — Licensee indemnifies against unauthorized use
10. Governing law — Federal Democratic Republic of Ethiopia
```

### Watermark as Legal Evidence
Each watermark layer provides court-admissible evidence:
- `X-Zenova-Instance` header is cryptographically signed (non-repudiation)
- Honeytoken records in database are unique per school
- License key encodes school identifier
- Docker labels are image-layer persistent

## Implementation Recommendations

### Week 1 — Foundation
1. Wire `watermark_seed_data()` into school activation flow
2. Move honeytoken registry from memory to database (persist across restarts)
3. Replace `SCHOOL_WATERMARK=dev` default with per-school generation

### Week 2 — Multi-Install Detection
4. Add IP logging to all license validation calls
5. Build concurrent session detection (Redis-based)
6. Implement geolocation (MaxMind GeoIP or IP-API)

### Week 3 — Response Automation
7. Auto-suspend on confirmed multi-installation
8. Super Admin notification system (Telegram + Email)
9. Dashboard for anti-piracy monitoring

### Week 4 — Hardening
10. Compile C extension for tamper-proof validation
11. Add integrity checks to all watermark locations
12. Penetration test the anti-piracy system

## Rollback Instructions

- Disable multi-installation detection: Set `ENABLE_PIRACY_DETECTION=False`
- Remove watermarks: Comment out watermark middleware in `main.py`
- Reset honeytokens: `DELETE FROM students WHERE first_name LIKE 'Honey_%'`
