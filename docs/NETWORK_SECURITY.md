# ZENOVA NETWORK SECURITY — MASTER SPECIFICATION

## School Network Architecture

```
                     ┌─────────────────────┐
                     │     INTERNET        │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │    School Router       │
                    │    (Firewall/NAT)      │
                    └───────────┬───────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────┴───────┐   ┌──────┴──────┐   ┌───────┴───────┐
    │  Local Network│   │  ZENOVA     │   │  WiFi Access  │
    │  192.168.x.x  │   │  Server     │   │  Points       │
    │  (Admin PCs)  │   │  10.0.0.100 │   │               │
    └───────────────┘   └─────────────┘   └───────────────┘
```

---

## Access Rules

### Inside School Network
All authenticated users have **NORMAL ACCESS** based on their role permissions.

### Outside School Network
The following roles become **VIEW ONLY**:

| Role | Inside Network | Outside Network |
|------|---------------|-----------------|
| SUPER_ADMIN | ✅ Full Access | ✅ Full Access (exempt) |
| ADMIN | ✅ Full Access | 👁 View Only |
| DIRECTOR | ✅ Full Access | 👁 View Only |
| REGISTRAR | ✅ Full Access | 👁 View Only |
| TEACHER | ✅ Full Access | 👁 View Only |
| FINANCE | ✅ Full Access | 👁 View Only |
| HR | ✅ Full Access | 👁 View Only |
| INVENTORY | ✅ Full Access | 👁 View Only |
| LIBRARY | ✅ Full Access | 👁 View Only |
| CAFETERIA | ✅ Full Access | 👁 View Only |
| AUDITOR | ✅ View Only | 👁 View Only (no change) |
| PARENT | ❌ No Access | ✅ Portal Access (cloud) |
| STUDENT | ❌ No Access | ✅ Portal Access (cloud) |

### View Only Restrictions
When in View Only mode:
- ❌ Cannot CREATE new records
- ❌ Cannot UPDATE existing records
- ❌ Cannot DELETE any records
- ❌ Cannot access Settings pages
- ❌ Cannot perform Approvals
- ✅ Can VIEW data (read-only)
- ✅ Can EXPORT reports (read-only data)
- ✅ Can VIEW audit logs (read-only)

---

## Detection Implementation

### IP Range Detection
```python
PRIVATE_RANGES = [
    "10.",         # 10.0.0.0/8
    "172.16.",     # 172.16.0.0/12
    "172.17.",
    "172.18.",
    "172.19.",
    "172.20.",
    "172.21.",
    "172.22.",
    "172.23.",
    "172.24.",
    "172.25.",
    "172.26.",
    "172.27.",
    "172.28.",
    "172.29.",
    "172.30.",
    "172.31.",
    "192.168.",    # 192.168.0.0/16
    "127.",        # localhost
]

def is_local_network(ip: str) -> bool:
    return any(ip.startswith(prefix) for prefix in PRIVATE_RANGES)
```

### Middleware Flow
```
1. Request arrives
2. Check X-Forwarded-For header (if behind proxy)
3. Fall back to request.client.host
4. If SUPER_ADMIN → skip check (full access everywhere)
5. If IP is NOT in private ranges:
   a. Set user.is_view_only = True on request state
   b. Endpoints check is_view_only before mutations
6. If IP is in private ranges:
   a. Normal access based on role permissions
```

### API Enforcement
```python
# In each mutation endpoint:
def create_student(student_data, current_user=Depends(get_current_user)):
    if current_user.is_view_only:
        raise HTTPException(
            status_code=403,
            detail="View only mode. Cannot create records outside school network."
        )
    # ... proceed with creation
```

---

## SUPER_ADMIN Exemption

SUPER_ADMIN is **exempt from all network restrictions**:
- Can access from any network (local, VPN, internet)
- Full create/update/delete access everywhere
- Can unlock locked accounting periods
- Can override any restriction

---

## Cloud Users (PARENT & STUDENT)

PARENT and STUDENT roles:
- Do NOT access the local server
- Access ONLY the cloud VPS portals
- Not affected by local network rules
- Authenticate via cloud authentication

---

## Security Recommendations

1. **HTTPS required** for external access
2. **VPN recommended** for ADMIN/DIRECTOR remote access
3. **Rate limiting** on login endpoints
4. **Session timeout** after 30 minutes of inactivity
5. **Audit all access attempts** (successful and failed)
6. **IP whitelist** optional for sensitive operations
