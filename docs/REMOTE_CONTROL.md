# ZENOVA Remote License Control

## Overview

The Control Center (org server) manages licenses for all School ERP servers remotely via a **heartbeat + control directive** channel. Schools send heartbeats every **1 hour**; org responds with control directives (suspend/force_verify) that take effect within one heartbeat interval.

---

## Architecture

```
┌─────────────────────┐      heartbeat (1h)      ┌─────────────────────┐
│   School Server     │ ──────────────────────► │   Org Server        │
│   (School ERP)      │                         │   (Control Center)  │
│                     │ ◄────────────────────── │                     │
│  - license check    │   control directives    │  - license DB       │
│  - feature gates    │   {suspend, force_      │  - heartbeat log    │
│  - Redis cache      │    verify, message}     │  - schools overview │
└─────────────────────┘                         └─────────────────────┘
```

---

## Heartbeat Protocol

### School → Org (POST `/api/v1/heartbeat`)

```json
{
  "server_id": "SRV-ABC123",
  "school_code": "SCH-001",
  "server_role": "MAIN_SCHOOL",
  "version": "v5.2.1",
  "timestamp": "2026-08-23T18:00:00Z",
  "license_key": "ZNV-A1B2-C3D4-E5F6-ABCD"
}
```

Headers:
- `X-Server-ID`: same as `server_id`
- `X-HMAC-Signature`: HMAC-SHA256 of `school_code` with `SYNC_SECRET`

### Org → School Response

```json
{
  "status": "ok",
  "received_at": "2026-08-23T18:00:01Z",
  "control": {
    "suspend": false,
    "force_verify": false,
    "message": ""
  }
}
```

**Control directives:**

| Directive | Effect | When Set |
|---|---|---|
| `suspend: true` | School locks licensed features immediately (NFC, QR, Import, ID Card) | License suspended/revoked OR school deactivated |
| `force_verify: true` | School clears cached license status, re-verifies on next check | License status changed (renewed, unsuspended) |
| `message: "..."` | Displayed in school logs / UI | Human-readable reason |

---

## Org-Side Implementation

### Heartbeat Persistence (`backend/app/api/v1/endpoints/license_authority.py`)

Every heartbeat stored in `school_heartbeats` table:

```sql
CREATE TABLE school_heartbeats (
    id UUID PRIMARY KEY,
    server_id VARCHAR(64) NOT NULL INDEX,
    school_code VARCHAR(64) NOT NULL INDEX,
    server_role VARCHAR(32),
    version VARCHAR(64),
    license_key VARCHAR(255) INDEX,
    ip_address VARCHAR(64),
    status VARCHAR(16) DEFAULT 'ok',  -- 'ok' | 'rejected'
    received_at TIMESTAMP NOT NULL INDEX
);
```

### Control Directive Logic

```python
def _build_control(db, payload) -> ControlDirective:
    control = ControlDirective()
    
    # 1. School deactivated
    school = db.query(School).filter(School.code == payload.school_code).first()
    if school and not school.is_active:
        control.suspend = True
        control.message = "School deactivated by ZENOVA. Contact support."
        return control

    # 2. License suspended/revoked
    lic = db.query(License).filter(License.key == payload.license_key).first()
    if lic and lic.status in (LicenseStatus.SUSPENDED, LicenseStatus.REVOKED):
        control.suspend = True
        control.force_verify = True
        control.message = f"License {lic.status.value} by ZENOVA."

    return control
```

### Schools Overview Endpoint

`GET /api/v1/schools/overview` (SUPER_ADMIN only)

Returns paginated list with:
- `online` (heartbeat within 2 intervals)
- `last_seen`, `last_version`, `last_server_role`
- `offline_for_hours`
- `license_status`, `license_type`, `license_valid_until`, `license_max_users`

---

## School-Side Implementation

### Applying Control (`backend/app/services/heartbeat_service.py`)

```python
def apply_remote_control(data: Dict) -> None:
    control = data.get("control") or {}
    r = get_redis()
    
    if control.get("force_verify"):
        r.delete("license:status")  # Clear 30-min cache
    
    if control.get("suspend"):
        message = control.get("message") or "License suspended by ZENOVA"
        r.setex("license:status", 300, json.dumps({
            "valid": False,
            "restrict_nfc": True,
            "restrict_qr": True,
            "restrict_import": True,
            "restrict_id_card": True,
            "message": message,
        }))
```

**Cache behavior:**
- Normal: `license:status` cached 1800s (30 min)
- Suspended: written with 300s TTL → re-applied every heartbeat
- Force verify: cache deleted → next feature check re-verifies

---

## Heartbeat Interval

**Changed from 6h → 1h** (`backend/app/core/constants.py`):

```python
HEARTBEAT_INTERVAL_HOURS = 1
```

Scheduler runs `run_heartbeat_if_due` every hour.

---

## Remote Operations (Org UI)

From **Schools Overview** page or **Licenses** page:

| Action | Effect | Propagation |
|---|---|---|
| **Suspend License** | `status = suspended` | Next heartbeat (≤1h) → school locks |
| **Revoke License** | `status = revoked` | Next heartbeat (≤1h) → school locks |
| **Renew/Extend License** | `valid_until` updated, `status = active` | Next heartbeat → `force_verify` → school re-verifies |
| **Deactivate School** | `is_active = false` | Next heartbeat → `suspend` |

---

## Verification

### Org Side

```bash
# Check heartbeat log
curl -kfsS -H "Authorization: Bearer <super_admin_token>" \
  https://org.example.com/api/v1/schools/overview

# Manual heartbeat test
curl -kfsS -X POST https://org.example.com/api/v1/heartbeat \
  -H "Content-Type: application/json" \
  -H "X-Server-ID: SRV-TEST" \
  -H "X-HMAC-Signature: $(echo -n "SCH-001" | openssl dgst -sha256 -hmac "sync-secret" | cut -d' ' -f2)" \
  -d '{"server_id":"SRV-TEST","school_code":"SCH-001","license_key":"ZNV-TEST"}'
```

### School Side

```bash
# Trigger heartbeat manually
docker exec deploy-backend-1 python -c "
from app.services.heartbeat_service import run_heartbeat_if_due
from app.database import SessionLocal
db = SessionLocal()
result = run_heartbeat_if_due(db)
print(result)
"
```

### Simulate Suspend

1. Org: suspend license in DB
2. School: wait ≤1h (or trigger heartbeat)
3. Verify: `GET /api/v1/health/license` returns suspended, NFC/QR blocked

---

## Security

- HMAC-SHA256 verification (rejects tampered heartbeats)
- `SYNC_SECRET` must be identical on both servers (set in `.env.vps`)
- Only org can send control directives (school only receives)
- Heartbeat endpoint is PUBLIC (no auth token) but HMAC-protected

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Heartbeat timeout | Network/firewall | Allow outbound HTTPS to org server |
| HMAC rejected | Secret mismatch | Sync `SYNC_SECRET` in both `.env.vps` |
| Suspend not applied | Cache TTL | Wait ≤1h or clear `license:status` in Redis |
| Org shows offline | Heartbeat not received | Check school `deploy-backend-1` logs |

---

## Deployment Notes

1. **Org server** must have `ZENOVA_LICENSE_SERVER` pointing to itself (or external license server)
2. **School servers** must have `ZENOVA_LICENSE_SERVER=http://<org-ip>` in `.env.vps`
3. Both need identical `SYNC_SECRET` in `.env.vps`
4. Heartbeat interval is **1 hour** — control propagates within 1h max