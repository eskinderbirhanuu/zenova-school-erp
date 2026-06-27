# ZENOVA QR & NFC SYSTEM — MASTER SPECIFICATION

## Overview

QR codes and NFC cards form the digital identity system for all people in the ZENOVA ecosystem.

---

## Supported Entities

| Entity | QR | NFC | Purpose |
|--------|----|-----|---------|
| Student | ✅ | ✅ | Attendance, cafeteria, library, verification |
| Parent | ✅ | ❌ | Parent portal, verification |
| Teacher | ✅ | ✅ | Attendance, cafeteria, verification |
| Staff | ✅ | ✅ | Attendance, access control |

---

## QR Code Specification

### Data Structure
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "encrypted_token": "<AES-256 encrypted payload>",
  "reference_type": "student",
  "reference_id": "<UUID of student record>",
  "school_id": "<UUID of school>",
  "branch_id": "<UUID of branch>"
}
```

### Generation Flow
```
1. User requests QR generation (REGISTRAR/DIRECTOR only)
2. System generates UUID v4
3. System encrypts payload with school-specific secret key
4. QR code image generated (PNG, 300×300 px)
5. QR code stored in qr_codes table
6. QR code returned as:
   - Image (PNG download)
   - Base64 (for display in browser)
   - Printable (for ID cards)
```

### Validation Flow (Scanning)
```
1. Scanner app reads QR code
2. System decrypts encrypted_token
3. System validates:
   - UUID exists in qr_codes table
   - is_active = TRUE
   - If expires_at set → not expired
   - reference_type matches expected type
4. Returns entity data (student name, photo, etc.)
5. Action performed (attendance, payment, verification)
```

### QR on ID Card
- Printed on student/teacher/staff ID cards
- Format: 2×2 cm square
- Includes school logo in center
- High contrast for reliable scanning

---

## NFC Card Specification

### Card Data
```json
{
  "card_uid": "04:12:34:56:78:9A:BC",
  "reference_type": "student",
  "reference_id": "<UUID of assigned person>",
  "issue_date": "2026-06-22T10:30:00Z",
  "expiry_date": "2028-06-22T10:30:00Z",
  "status": "active"
}
```

### Assignment Flow
```
1. User (REGISTRAR/DIRECTOR) initiates NFC assignment
2. NFC writer device scans card → reads Card UID
3. System checks: Card UID not already assigned
4. System creates NFCCard record
5. NFC card linked to person
6. Audit log: NFC_ASSIGNED
```

### Status Management
| Status | Description |
|--------|-------------|
| active | Card in use |
| expired | Past expiry date |
| revoked | Manually deactivated |
| lost | Reported lost → can be replaced |

### Usage Flow (Scanning)
```
1. NFC reader scans card
2. System receives Card UID
3. System looks up NFCCard by card_uid
4. Validates: status = active, not expired
5. Returns assigned person data
6. Action performed (attendance, payment, verification)
```

---

## Security Considerations

### QR Security
- Each QR contains encrypted token (AES-256)
- Token includes timestamp to prevent replay attacks
- School-specific encryption key
- QR can be expired/deactivated if compromised

### NFC Security
- Card UID is hardware-locked (cannot be cloned easily)
- Card can be remotely revoked
- Lost card → report → revoke → issue replacement
- One card per person at a time

---

## ID Card Design

```
┌──────────────────────┐
│   [School Logo]      │
│   ZENOVA SCHOOL      │
│                      │
│   [Photo]            │
│                      │
│   Name: Abebe K.     │
│   ID: STU-2026-00001 │
│   Grade: 5-A         │
│                      │
│   [QR Code]          │
│                      │
│   Issued: 2026-06-22 │
└──────────────────────┘
```

### Card Types
| Type | Color | Purpose |
|------|-------|---------|
| Student | Blue | Identity + attendance + cafeteria |
| Teacher | Green | Identity + attendance + access |
| Staff | Orange | Identity + access |
| Parent | Gray | Parent portal verification |

---

## Integration Points

| Module | QR Usage | NFC Usage |
|--------|----------|-----------|
| Attendance | Scan QR → mark present | Tap NFC → mark present |
| Cafeteria | Scan QR → pay with wallet | Tap NFC → pay with wallet |
| Library | Scan QR → borrow/return book | - |
| Verification | Scan QR → verify identity | - |
| Access Control | - | Tap NFC → open door |
