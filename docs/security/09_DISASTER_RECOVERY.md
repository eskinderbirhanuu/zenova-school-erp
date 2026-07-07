# Disaster Recovery

## Overview

Disaster recovery covers server replacement, hardware failure, data loss, and emergency access restoration. The system must allow legitimate recovery while preventing abuse through Super Admin approval workflows and cryptographic verification.

## Current State

| Capability | Status | Detail |
|-----------|--------|--------|
| Server replacement | ❌ Not implemented | No workflow exists |
| Backup creation | ✅ Implemented | `POST /backups` creates pg_dump |
| Backup download | ✅ Implemented | `GET /backups/{filename}/download` |
| Backup encryption | ❌ Not implemented | Backups are plain SQL |
| Backup restore | ❌ Not implemented | No restore endpoint |
| License transfer | ❌ Not implemented | Cannot move license to new server |
| Emergency access | ❌ Not implemented | No break-glass procedure |
| Recovery codes | ⚠️ Partially | HMAC recovery codes for password reset only |

## Server Replacement Workflow

### Standard Flow (Planned)

```
SCENARIO: Old server fails → New server provisioned

1. School admin logs into Super Admin portal
2. Submits server replacement request
   → New machine fingerprint captured
   → Reason for replacement documented
   → Signed by current school admin (if possible)

3. Super Admin reviews request
   → Checks audit log for previous activations
   → Verifies request authenticity (phone call/email)
   → Approves or rejects

4. If approved:
   → Old license deactivated in cloud
   → New license file generated (bound to new HW)
   → Encrypted backup key released
   → School admin downloads backup + new .lic

5. School admin restores on new server:
   → Install Docker + ZENOVA
   → Place new .lic file
   → Restore encrypted backup
   → System starts normally
```

### Emergency Flow (No Super Admin Access)

```
SCENARIO: Super Admin unavailable, school needs urgent recovery

1. School admin initiates emergency recovery
2. System generates recovery code (valid 24h)
3. Code verified against pre-shared emergency key
4. 7-day temporary license issued automatically
5. Super Admin notified of emergency recovery
6. Must approve within 7 days or license suspended
```

## Backup Protection

### Encryption at Rest

```bash
# Backup script enhancement
#!/bin/bash
BACKUP_FILE="zenova_backup_$(date +%Y%m%d_%H%M%S).sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"

# Create backup
pg_dump -h localhost -U zenova zenova_db > /tmp/$BACKUP_FILE

# Encrypt with school-specific key
SCHOOL_KEY=$(cat /etc/zenova/backup_key)
openssl enc -aes-256-gcm \
    -salt \
    -pbkdf2 \
    -iter 100000 \
    -pass pass:$SCHOOL_KEY \
    -in /tmp/$BACKUP_FILE \
    -out /backups/$ENCRYPTED_FILE

# Sign the encrypted backup
openssl dgst -sha256 -sign /etc/zenova/private.pem \
    -out /backups/$ENCRYPTED_FILE.sig \
    /backups/$ENCRYPTED_FILE

# Cleanup
rm /tmp/$BACKUP_FILE
```

### Backup Key Management

| Key | Purpose | Storage | Rotation |
|-----|---------|---------|----------|
| Backup encryption key | Encrypt/decrypt backups | School .env + Super Admin vault | Every 90 days |
| Backup signing key | Sign backups | School server (private) | Never rotated |
| Backup verification key | Verify backup origin | Super Admin vault (public) | Never rotated |

### Restore Process

```bash
#!/bin/bash
ENCRYPTED_FILE=$1
SCHOOL_KEY=$(cat /etc/zenova/backup_key)

# Verify signature
openssl dgst -sha256 -verify /etc/zenova/public.pem \
    -signature ${ENCRYPTED_FILE}.sig \
    $ENCRYPTED_FILE || exit 1

# Decrypt
openssl enc -d -aes-256-gcm \
    -pbkdf2 \
    -iter 100000 \
    -pass pass:$SCHOOL_KEY \
    -in $ENCRYPTED_FILE \
    -out /tmp/restore.sql

# Restore
psql -h localhost -U zenova zenova_db < /tmp/restore.sql
```

## License Transfer Process

### API Design

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/admin/license/transfer-request` | POST | Request license transfer |
| `/admin/license/transfer-approve/{id}` | POST | Approve transfer |
| `/admin/license/transfer-reject/{id}` | POST | Reject transfer |
| `/admin/disaster/emergency-access` | POST | Request emergency access |
| `/admin/disaster/recovery-key` | GET | Get recovery key (24h TTL) |
| `/admin/disaster/restore` | POST | Restore from encrypted backup |

### Transfer Request Schema

```python
class LicenseTransferRequest(BaseModel):
    license_id: str
    reason: str  # "hardware_failure" | "server_upgrade" | "migration"
    old_fingerprint: str
    new_fingerprint: str
    new_hardware_components: dict  # All 8 components
    authorized_by: str  # School admin name
    authorized_contact: str  # Phone/email for verification
```

### Transfer Approval Logic

```python
def approve_transfer(db: Session, request_id: str, admin_id: str):
    request = db.query(LicenseTransfer).get(request_id)
    
    # Deactivate old license
    old_license = db.query(License).get(request.license_id)
    old_license.status = "TRANSFERRED"
    old_license.machine_fingerprint = None
    
    # Generate new .lic file
    new_lic = create_license_file(
        school_id=old_license.school_id,
        machine_fingerprint=request.new_fingerprint,
        valid_until=old_license.valid_until,
    )
    write_lic_file(new_lic)
    
    # Audit
    log_audit("LICENSE_TRANSFERRED", details={
        "old_fingerprint": request.old_fingerprint,
        "new_fingerprint": request.new_fingerprint,
        "reason": request.reason,
        "approved_by": admin_id,
    })
    
    # Notify school
    notification_service.send_notification(
        school_id=old_license.school_id,
        message="License transfer approved. New .lic file generated.",
    )
    
    return {"status": "approved", "new_lic": new_lic}
```

## Break-Glass Procedure

### Emergency Access Codes
```
1. Pre-generated during initial setup
2. 10 emergency codes printed and stored securely
3. Each code is single-use
4. 7-day temporary license per code
5. Super Admin notified immediately on use
6. All codes trackable in audit log
```

### Generation
```python
def generate_emergency_codes(count: int = 10) -> list[str]:
    codes = []
    for _ in range(count):
        code = secrets.token_hex(8).upper()  # 16-char code
        hashed = hashlib.sha256(code.encode()).hexdigest()
        # Store hashed, never plaintext
        store_emergency_code(hashed)
        codes.append(code)
    return codes  # Print and secure physically
```

## Implementation Plan

### Phase 1 (3 days)
1. Build license transfer request/approve/reject endpoints
2. Implement backup encryption (AES-256-GCM)
3. Add backup signing

### Phase 2 (3 days)
4. Build restore endpoint (verify signature → decrypt → restore)
5. Implement emergency access code system
6. Create Super Admin approval UI

### Phase 3 (2 days)
7. Add automated backup encryption in scheduled backup job
8. Create disaster recovery documentation
9. Test full recovery flow (backup → new server → restore)

## Recovery Test Checklist

```markdown
## Quarterly Recovery Test

- [ ] Create backup
- [ ] Encrypt backup
- [ ] Sign backup
- [ ] Transfer to new server (or temp VM)
- [ ] Verify backup signature
- [ ] Decrypt backup
- [ ] Restore database
- [ ] Place new .lic file
- [ ] Verify all services start
- [ ] Verify license is active
- [ ] Verify all data is intact
- [ ] Verify audit trail preserved
- [ ] Run full test suite
- [ ] Document any issues
```

## Rollback Instructions

- Revert transfer: Reactivate old license from Super Admin panel
- Emergency code misuse: Revoke all unused codes, regenerate
- Failed restore: Re-deploy original server from last known-good backup
