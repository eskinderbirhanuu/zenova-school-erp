# Registration & Identity System

## Core Rules

1. Only REGISTRAR can register students (teachers CANNOT)
2. DIRECTOR creates Registrar, Teacher, and all staff accounts
3. Every registration creates an audit record
4. Student ID, QR code, and NFC are auto-generated
5. Parent linking uses smart search to prevent duplicates

## Student Registration Workflow

### Step 1: Registrar opens form
`/students/create` — Permission: `students.create`

### Step 2: Student Information
Required fields: First Name, Middle Name, Last Name, Gender, DOB (≤18 years ago), Grade, Section, Academic Year, Emergency Contact, Admission Date.
Optional: Address, Nationality, Blood Group, Photo (max 5MB, 300×300 min).

### Step 3: Parent/Guardian Information
Smart search before creating new parent. Simultaneously checks:
- Phone Number (phone_1, phone_2)
- National ID, Passport ID, Kebele ID
- Full Name (fuzzy match)

**Results**: Exact match → auto-link. Multiple matches → registrar selects. No match → create new parent.

### Step 4: Review & Confirm
On "Register":
1. Generate Student ID (`STU-{YEAR}-{SEQUENCE:05d}`)
2. Create Student record
3. Create/link Parent record(s)
4. Create parent_student_link records
5. Generate QR Code (UUID + encrypted token)
6. (Optional) Assign NFC card
7. Create Audit Log (STUDENT_CREATED)

## Parent Linking

- One Parent → Many Students (unlimited)
- One Student → Many Parents (unlimited)
- Smart search prevents exact duplicates
- Primary guardian marked with `is_primary = TRUE`
- Link can be removed via `DELETE /parents/{id}/unlink`

## ID Prefixes

| Entity | Prefix | Example |
|--------|--------|---------|
| Student | STU | STU-2026-00001 |
| Teacher | TCH | TCH-2026-0001 |
| Staff | STF | STF-2026-0001 |
| Parent | PAR | PAR-2026-0001 |

## QR Code System

### Data Structure
```json
{
  "uuid": "a1b2c3d4-...",
  "encrypted_token": "<AES-256 encrypted>",
  "reference_type": "student",
  "reference_id": "<UUID>",
  "school_id": "<UUID>",
  "branch_id": "<UUID>"
}
```

### Generation
REGISTRAR/DIRECTOR only. AES-256 encrypted with school-specific key. Output: PNG (300×300 px), Base64, or printable for ID cards.

### Validation
Scanner decrypts token → validates UUID exists, is_active, not expired, type matches → returns entity data.

### ID Card Layout
School logo, photo, name, ID, grade/section, QR code, issue date. Color-coded by role (Blue=Student, Green=Teacher, Orange=Staff, Gray=Parent).

## NFC Card System

| Field | Description |
|-------|-------------|
| Card UID | Hardware UID (e.g., 04:12:34:56:78:9A:BC) |
| Assignment | REGISTRAR/DIRECTOR initiates, NFC writer scans card |
| Uniqueness | Card UID checked for duplicate assignment |
| Statuses | active, expired, revoked, lost |

### Usage
Tap NFC → system receives Card UID → looks up NFCCard → validates status + expiry → returns person data → performs action.

## Integration Points

| Module | QR Usage | NFC Usage |
|--------|----------|-----------|
| Attendance | Scan QR → mark present | Tap NFC → mark present |
| Cafeteria | Scan QR → pay with wallet | Tap NFC → pay with wallet |
| Library | Scan QR → borrow/return | - |
| Verification | Scan QR → verify identity | - |
| Access Control | - | Tap NFC → open door |

## Student Transfer & Promotion

- REGISTRAR can transfer students between sections/grades
- Transfer creates audit log with old_data / new_data
- Bulk promotion at end of academic year
- Promotion record created; graduating students marked `graduated`
- Report card generated for promoted students

## Registration Audit Events

`STUDENT_CREATED`, `STUDENT_UPDATED`, `STUDENT_DELETED`, `STUDENT_TRANSFERRED`, `STUDENT_PROMOTED`, `PARENT_CREATED`, `PARENT_LINKED`, `PARENT_UNLINKED`, `QR_GENERATED`, `NFC_ASSIGNED`
