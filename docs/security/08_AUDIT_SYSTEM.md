# Audit System

## Overview

The ZENOVA audit system logs every significant action for accountability, forensics, and anti-piracy tracking. All license-related events (activations, device changes, violations) are specifically tracked for security monitoring.

## Current State

### Existing Audit Infrastructure

| Component | Status | Details |
|-----------|--------|---------|
| `AuditLog` model | ✅ Implemented | `table_name, record_id, action, old_values, new_values, user_id, ip_address, user_agent, school_id, timestamp` |
| `log_audit()` function | ✅ Implemented | ~96 call sites across services |
| Audit endpoints | ✅ Implemented | `GET /audit-logs` with filtering |
| Financial audit | ✅ Implemented | Journal entries, payment audit trail |
| Security events | ✅ Implemented | Login, logout, failed login attempts |
| License-specific events | ❌ Not implemented | No ACTIVATION/DEVICE_CHANGE/VIOLATION events |
| Anti-piracy dashboard | ❌ Not implemented | No centralized piracy monitoring |
| Automated alerts | ❌ Not implemented | No real-time notification on violations |

### Known Issue
```python
# audit.py — existing implementation
def log_audit(db, ...):
    db.add(audit_entry)
    db.commit()  # ← BREAKS ATOMICITY — fixed in v0.9.1
```

**Fix Applied:** `log_audit()` no longer self-commits (v0.9.1). Callers control the commit.

## License-Specific Audit Events

### Event Types

| Event | Trigger | Data Captured |
|-------|---------|---------------|
| `LICENSE_ACTIVATED` | First activation | license_key, school_id, machine_fingerprint, IP, geo |
| `LICENSE_VALIDATED` | Periodic cloud check | status, hardware_match, days_remaining |
| `LICENSE_EXPIRED` | Expiry date reached | license_key, valid_until, days_overdue |
| `LICENSE_SUSPENDED` | Super Admin action | reason, admin_id, previous_status |
| `LICENSE_REVOKED` | Piracy detection | evidence, detection_method, admin_id |
| `DEVICE_CHANGED` | Hardware mismatch | old_fingerprint, new_fingerprint, components_changed |
| `DEVICE_APPROVED` | Super Admin approves HW change | admin_id, old_hw, new_hw |
| `MULTI_INSTALL_DETECTED` | Same key from different IP/city | source_ips, cities, timestamps |
| `TAMPER_DETECTED` | Integrity check failure | file_path, expected_hash, actual_hash |
| `OFFLINE_GRACE_START` | Internet lost | days_remaining (45) |
| `OFFLINE_GRACE_EXPIRED` | Grace period over | days_offline, features_locked |
| `LICENSE_RENEWED` | License extended | old_expiry, new_expiry, duration |

### Audit Schema (License Extension)

```sql
-- Add to AuditLog model or create license_audit table
ALTER TABLE audit_logs ADD COLUMN license_id VARCHAR(36) REFERENCES licenses(id);
ALTER TABLE audit_logs ADD COLUMN geo_ip VARCHAR(45);  -- Source IP at time of event
ALTER TABLE audit_logs ADD COLUMN geo_city VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN geo_country VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN detection_method VARCHAR(50);  -- How violation was detected
```

## Anti-Piracy Monitoring Dashboard

### Data to Display

```
┌─────────────────────────────────────────────────────┐
│  ZENOVA License Monitoring Dashboard                 │
├─────────────────────────────────────────────────────┤
│  Active Licenses: 142                                │
│  Suspended: 3                                        │
│  Revoked: 1                                          │
│  Under Review: 2                                     │
├─────────────────────────────────────────────────────┤
│  ┌─ Recent Alerts ────────────────────────────────┐  │
│  │  ⚠️  SUSPICIOUS: License ZNV-M-ABC used from   │  │
│  │     Addis Ababa AND Bahir Dar simultaneously    │  │
│  │  🔴 TAMPER: School XYZ — integrity check failed │  │
│  │  ✅ APPROVED: School ABC — device change OK     │  │
│  └────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  ┌─ License Usage ────────────────────────────────┐  │
│  │  ████████████████░░░░ Active (80%)              │  │
│  │  ██████░░░░░░░░░░░░░ Expiring in 30d (30%)     │  │
│  │  ██░░░░░░░░░░░░░░░░░ Violations (10%)          │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Dashboard Endpoints

| Endpoint | Purpose | Permission |
|----------|---------|------------|
| `GET /admin/license/audit` | License event log | SUPER_ADMIN |
| `GET /admin/license/alerts` | Active alerts | SUPER_ADMIN |
| `GET /admin/license/stats` | Usage statistics | SUPER_ADMIN |
| `GET /admin/security/violations` | Piracy/tamper events | SUPER_ADMIN |
| `POST /admin/alerts/ack` | Acknowledge alert | SUPER_ADMIN |

## Alerting Rules

### Automated Alerts (Telegram + Email)

| Condition | Priority | Channel | Action |
|-----------|----------|---------|--------|
| Single license from 2+ cities | HIGH | Telegram | Flag, investigate |
| Single license from 2+ countries | CRITICAL | Telegram + Email | Auto-suspend |
| 5+ activations in 24h (same key) | HIGH | Telegram | Lock for 24h |
| Tamper detection | CRITICAL | Telegram + Email | Suspend license |
| File integrity failure | HIGH | Telegram | Enter restricted mode |
| License expired | MEDIUM | Email | Notify school admin |
| Offline grace < 7 days | LOW | Email | Reminder |
| Device change pending approval | MEDIUM | Telegram | Notify Super Admin |

### Implementation

```python
# services/alert_service.py
from enum import Enum

class AlertPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

def send_license_alert(event_type: str, priority: AlertPriority, data: dict):
    """Send alert via configured channels based on priority."""
    message = format_alert_message(event_type, data)
    
    if priority in (AlertPriority.HIGH, AlertPriority.CRITICAL):
        # Telegram (immediate)
        telegram_service.send_message(SUPER_ADMIN_CHAT_ID, message)
        
    if priority == AlertPriority.CRITICAL:
        # Email + SMS (redundant)
        email_service.send_email(SUPER_ADMIN_EMAIL, "ZENOVA Alert", message)
        sms_service.send_sms(SUPER_ADMIN_PHONE, message[:160])
    
    if priority in (AlertPriority.LOW, AlertPriority.MEDIUM):
        # In-app notification
        create_notification(SUPER_ADMIN_USER_ID, message)
    
    # Always log
    log_audit("ALERT_SENT", details={
        "event_type": event_type,
        "priority": priority.value,
        "data": data,
    })
```

## Audit Retention & Archival

### Policy
| Audit Type | Retention | Archive | Action |
|-----------|-----------|---------|--------|
| License events | 7 years | Perpetual | Never deleted |
| Security events | 3 years | 5 years | Archived after 3y |
| Financial audit | 10 years | Perpetual | Legal requirement |
| General activity | 1 year | 3 years | Archived after 1y |
| Sync audit | 90 days | 1 year | Archived after 90d |

### Implementation
```python
# Scheduled monthly job
def archive_audit_logs():
    cutoff = datetime.utcnow() - timedelta(days=365)
    old_logs = db.query(AuditLog).filter(AuditLog.created_at < cutoff).all()
    
    for log in old_logs:
        # Encrypt and store in archive table
        archive = AuditArchive(
            table_name=log.table_name,
            action=log.action,
            payload=encrypt_aes_gcm(json.dumps(log.to_dict())),
            archived_at=datetime.utcnow(),
        )
        db.add(archive)
        db.delete(log)
    
    db.commit()
```

## Implementation Plan

### Phase 1 (2 days)
1. Add license-specific audit event types
2. Implement `log_license_event()` function
3. Wire license events into activation/validation flow

### Phase 2 (3 days)
4. Build alerting service (Telegram + Email)
5. Configure alert rules for piracy detection
6. Create Super Admin notification templates

### Phase 3 (3 days)
7. Build license monitoring dashboard API
8. Create frontend dashboard pages
9. Add audit archival job

## Rollback

- Remove audit additions: Drop `license_id`, `geo_ip` columns from `audit_logs`
- Disable alerts: `set ALERTS_ENABLED=False`
- Reset archival: Run restore script from archive table
