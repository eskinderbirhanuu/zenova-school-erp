# ZENOVA LICENSE SYSTEM — MASTER SPECIFICATION

## Overview

ZENOVA is locked until license verification succeeds.
The system cannot be used before activation.

---

## License Key Format

```
ZNV-XXXX-XXXX-XXXX-XXXX
│    │    │    │    │
│    │    │    │    └── Segment 4 (random)
│    │    │    └─────── Segment 3 (random)
│    │    └──────────── Segment 2 (branch count)
│    └───────────────── Segment 1 (encrypted data)
└────────────────────── Prefix ZNV
```

### Key Validation Rules
- Prefix: ZNV (case sensitive)
- Segments: 5 segments separated by hyphens
- Each segment: Alphanumeric (uppercase), 4 chars
- Checksum: Last character validates the key

---

## Activation Flow

### Step 1: Main License Key
```
User enters MAIN LICENSE KEY
  → POST /api/v1/licenses/verify
  → System validates format + checksum
  → System queries license server (or local DB for offline)
  → Returns: VALID or INVALID
  → If valid → proceed to Step 2
```

### Step 2: Branch License Key
```
User enters BRANCH LICENSE KEY
  → POST /api/v1/licenses/verify
  → Same validation as Main License
  → Branch key linked to Main Key
  → If valid → proceed to Setup Wizard
```

### Step 3: Setup Wizard
```
Step 3a: Create School
  → School Name, Code, Address, Phone, Email
  → Creates school record

Step 3b: Create Branch
  → Branch Name, Code, Address
  → Creates branch record linked to school

Step 3c: Create Admin
  → Admin Full Name, Email, Phone, Password
  → Creates first ADMIN user for the school
  → Sets school owner_id = admin.id
  → Sets school.is_setup_complete = TRUE

Result:
  → System fully activated
  → ADMIN can login
  → Dashboard available
```

---

## License Types

| Type | Duration | Features |
|------|----------|----------|
| Trial | 30 days | All features, limited to 500 students |
| Monthly | 30 days | Full features, per-school pricing |
| Yearly | 365 days | Full features, discounted |
| Lifetime | Unlimited | Full features, one-time payment |

---

## License Statuses

| Status | Description | Action |
|--------|-------------|--------|
| Active | License valid and in use | Normal operation |
| Expired | Past valid_until date | System partially locked |
| Suspended | Manually suspended by SUPER_ADMIN | System fully locked |
| Revoked | Permanently revoked | System fully locked |

### Expired License Behavior
- System displays warning banner: "License Expired"
- View-only access for all roles
- Only SUPER_ADMIN can renew/re-activate
- Data remains intact (no deletion)

---

## License Model

| Field | Description |
|-------|-------------|
| id | UUID primary key |
| key | License key string (unique) |
| license_type | trial, monthly, yearly, lifetime |
| status | active, expired, suspended, revoked |
| school_id | FK → schools (nullable until activation) |
| branch_id | FK → branches (nullable until activation) |
| valid_from | License start date |
| valid_until | License expiry (null = lifetime) |
| max_users | Maximum allowed users |
| created_at | Record creation timestamp |
| updated_at | Last update timestamp |

---

## API Endpoints

```
POST   /api/v1/licenses/verify       # Verify license key (before activation)
POST   /api/v1/licenses/activate     # Activate license for school
GET    /api/v1/licenses              # List all licenses (SUPER_ADMIN only)
GET    /api/v1/licenses/{id}         # Get license details
POST   /api/v1/licenses              # Create new license (SUPER_ADMIN only)
PATCH  /api/v1/licenses/{id}/status  # Update status (SUPER_ADMIN only)
GET    /api/v1/licenses/status       # Get current license status

POST   /api/v1/schools               # Create school (part of setup)
GET    /api/v1/schools/{id}
PATCH  /api/v1/schools/{id}
POST   /api/v1/schools/{id}/setup-complete  # Mark setup as complete
```

---

## License Verification Algorithms

### Offline Verification (Local School Server)
```python
# Uses cryptographic signature verification
def verify_license_key(key: str) -> bool:
    # 1. Check format (ZNV-XXXX-XXXX-XXXX-XXXX)
    # 2. Validate checksum
    # 3. Decrypt segment 1 (contains issue date, school type)
    # 4. Check if key has been used/registered in local DB
    # 5. Return isValid + license data
```

### Online Verification (Future)
```python
# Queries ZENOVA license server
def verify_license_online(key: str) -> dict:
    # 1. POST to https://license.zenova.app/verify
    # 2. Server validates key
    # 3. Returns license data + signature
    # 4. Local server verifies signature
```

---

## Setup Wizard UI

The setup wizard is a 3-step form that appears on first access:

```
Screen 1: License Activation
  ┌─────────────────────────────┐
  │  ZENOVA LICENSE ACTIVATION  │
  │                             │
  │  Main License Key:          │
  │  [________________________] │
  │                             │
  │  Branch License Key:        │
  │  [________________________] │
  │                             │
  │  [Verify & Continue]        │
  └─────────────────────────────┘

Screen 2: School Setup
  ┌─────────────────────────────┐
  │  SCHOOL INFORMATION          │
  │                             │
  │  School Name: [____________] │
  │  School Code: [____________] │
  │  Address:     [____________] │
  │  Phone:       [____________] │
  │  Email:       [____________] │
  │                             │
  │  [Continue]                 │
  └─────────────────────────────┘

Screen 3: Admin Account
  ┌─────────────────────────────┐
  │  CREATE ADMIN ACCOUNT        │
  │                             │
  │  Full Name:  [____________] │
  │  Email:      [____________] │
  │  Password:   [____________] │
  │  Confirm:    [____________] │
  │                             │
  │  [Complete Setup]           │
  └─────────────────────────────┘
```
