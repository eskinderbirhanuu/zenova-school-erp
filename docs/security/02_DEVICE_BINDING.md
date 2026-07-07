# Device Binding

## Overview

Every ZENOVA license is cryptographically bound to the hardware it runs on. Device binding prevents license sharing by tying the license to a unique machine fingerprint. Hardware changes beyond a 75% tolerance threshold trigger a review mode requiring Super Admin approval.

## Fingerprint Composition

### 8 Hardware Components

| # | Component | Linux Source | Windows Source |
|---|-----------|-------------|----------------|
| 1 | MAC Address | `/sys/class/net/*/address` | `uuid.getnode()` |
| 2 | CPU Serial | `/proc/cpuinfo` | `wmic cpu get ProcessorId` |
| 3 | Machine ID | `/etc/machine-id` | `wmic csproduct get UUID` |
| 4 | Disk Serial | `udevadm info` | `wmic diskdrive get SerialNumber` |
| 5 | Hostname | `platform.node()` | `platform.node()` |
| 6 | OS Version | `platform.platform()` | `platform.platform()` |
| 7 | DMI UUID (BIOS) | `/sys/class/dmi/id/product_uuid` | `wmic csproduct get UUID` |
| 8 | Boot ID | `/proc/sys/kernel/random/boot_id` | `wmic os get LastBootUpTime` |

### Fingerprint Generation

```python
def get_machine_fingerprint() -> str:
    components = [
        get_mac_address(),
        get_cpu_serial(),
        get_machine_id(),
        get_disk_serial(),
        platform.node(),
        platform.platform(),
        get_dmi_uuid(),
        get_boot_id(),
    ]
    raw = ":".join(components)
    return hashlib.sha256(raw.encode()).hexdigest()
```

### Short Fingerprint (Display)
First 8 hex characters of the full SHA-256 (e.g., `"a1b2c3d4"`). Used in UI and audit logs.

## Binding Strategy

### First Activation (Bind)
```
License activated for the first time
  → fingerprint stored in license DB record
  → .lic file written with embedded fingerprint
  → server_identity.json created
```

### Subsequent Starts (Verify)
```
Startup validation:
  Compute current fingerprint
  Compare with stored fingerprint
  If exact match → OK
  If 75% match (6/8 components) → OK, minor change
  If < 75% match → REVIEW MODE
```

### Component-Level Matching
```python
def match_fingerprint(stored_components: list, current_components: list) -> bool:
    """75% tolerance: 6 out of 8 components must match."""
    if len(stored_components) != len(current_components):
        return False
    matches = sum(1 for a, b in zip(stored_components, current_components) if a == b)
    return matches >= 6  # 75% threshold
```

## Review Mode

### Triggers
- Hardware change > 25% (fewer than 6/8 components match)
- New motherboard, new CPU, new disk all at once
- Migration from physical to virtual (or vice versa)

### Flow
```
REVIEW MODE ENTERED
  → Full read-only access (no mutations)
  → Notification sent to Super Admin
  → School admin requests reactivation
  → Super Admin reviews audit log
  → Super Admin approves/rejects
  → If approved: new .lic file generated
  → If rejected: license marked SUSPENDED
```

### Escalation Paths
| Scenario | Action | Timeframe |
|----------|--------|-----------|
| Minor HW change (1-2 components) | Auto-approved, logged | Instant |
| Major HW change (3-5 components) | Review mode, email alert | 24h auto-approve |
| Full HW change (6-8 components) | Review mode, locked | Super Admin required |
| VM migration (same host) | Auto-detect VM, approve | Instant |
| Server replacement | Disaster recovery workflow | Super Admin required |

## Anti-VM / Container Detection

### Detection Points
- Check for Docker container: `/proc/1/cgroup`
- Check for VM: DMI UUID pattern, CPU flags
- Check for common hypervisor MAC prefixes
- Compare hostname patterns

### Policy
| Environment | Binding Method | Grace Period |
|-------------|---------------|--------------|
| Bare metal | Full 8-component | 45 days |
| VM (full) | Machine ID + Disk Serial | 30 days |
| Docker container | Host Machine ID (passthrough) | 15 days |
| Unknown | Lock to hostname + MAC | 7 days |

## Database Schema

```sql
-- Core fingerprint storage on License model
ALTER TABLE licenses ADD COLUMN machine_fingerprint VARCHAR(64);
ALTER TABLE licenses ADD COLUMN hardware_id TEXT;  -- base64 JSON of all 8 components
ALTER TABLE licenses ADD COLUMN offline_grace_start TIMESTAMP;
ALTER TABLE licenses ADD COLUMN last_online_validation TIMESTAMP;

-- Server identity
CREATE TABLE server_identity (
    id VARCHAR(36) PRIMARY KEY,
    fingerprint_sha256 VARCHAR(64) NOT NULL,
    server_role VARCHAR(20) NOT NULL,
    hardware_components JSONB,  -- all 8 components stored for 75% matching
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

### Risks
- **VM cloning**: All VMs with same base image have same fingerprint
  - Mitigation: Inject unique machine-id at first boot
- **MAC spoofing**: Easy to change
  - Mitigation: MAC is only 1 of 8 components; need 6/8 match
- **Docker container same host**: All containers share host fingerprint
  - Mitigation: License per host, not per container
- **Cloud server migration**: IP/hostname changes
  - Mitigation: 45-day grace + Super Admin approval workflow

### Best Practices
1. Never rely on a single hardware component
2. Log all fingerprint mismatches for forensic analysis
3. Allow Super Admin to manually reset binding
4. Encrypt hardware_id in database at rest
5. Rate-limit activation attempts to prevent brute-force

## Implementation Recommendations

### Phase 1 (1 day)
- Ensure `match_fingerprint()` with 75% tolerance is actually wired into validation
- Store all 8 raw components for forensic matching (not just SHA-256 hash)
- Add fingerprint mismatch audit events

### Phase 2 (2 days)
- Implement review mode with full workflow
- Add Super Admin approval endpoints
- Create notification templates for device changes

### Phase 3 (3 days)
- Add VM/container detection
- Implement TPM-based binding (where available)
- Build device history tracking dashboard
