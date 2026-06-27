# ZENOVA REGISTRATION RULES — MASTER SPECIFICATION

## Core Rules

1. **Only REGISTRAR can register students.**
2. **Teachers CANNOT register students.**
3. **DIRECTOR creates Registrar, Teacher, and all staff accounts.**
4. Every registration creates an audit record.
5. Student ID, QR code, and NFC are auto-generated.
6. Parent linking uses smart search to prevent duplicates.

---

## Student Registration — Complete Workflow

### Step 1: Registrar opens registration form
- Access: `/students/create`
- Permission: `students.create` (REGISTRAR, DIRECTOR, ADMIN, SUPER_ADMIN only)

### Step 2: Enter Student Information

| Field | Required | Type | Validation |
|-------|----------|------|------------|
| First Name | ✅ | text | 2–100 chars, letters only |
| Middle Name | ✅ | text | 2–100 chars, letters only |
| Last Name | ✅ | text | 2–100 chars, letters only |
| Gender | ✅ | select | male / female |
| Date of Birth | ✅ | date | Must be ≤ 18 years ago |
| Grade | ✅ | select | From classes table |
| Section | ✅ | select | From sections table |
| Academic Year | ✅ | select | Current year pre-selected |
| Address | ❌ | textarea | |
| Nationality | ❌ | text | |
| Blood Group | ❌ | select | A+, A-, B+, B-, AB+, AB-, O+, O- |
| Photo | ❌ | upload | Max 5MB, JPG/PNG, 300×300 min |
| Emergency Contact | ✅ | text | Valid phone format |
| Admission Date | ✅ | date | Default: today |

### Step 3: Enter Parent/Guardian Information

The system performs a **SMART SEARCH** before creating a new parent:

**Search Fields (all checked simultaneously):**
- Phone Number (phone_1, phone_2)
- National ID
- Passport ID
- ID card (Kebele ID)
- Full Name (fuzzy match)

**Search Results:**
| Result | Action |
|--------|--------|
| EXACT MATCH (1 result) | Auto-link parent to student |
| MULTIPLE MATCHES | Show list → Registrar selects correct one |
| NO MATCH | Show create form → Registrar fills parent details |

**Parent Fields:**

| Field | Required | Type | Validation |
|-------|----------|------|------------|
| Full Name | ✅ | text | 2–255 chars |
| Relationship | ✅ | select | father, mother, guardian, other |
| Phone 1 | ✅ | text | Valid phone, unique per school |
| Phone 2 | ❌ | text | Valid phone |
| Occupation | ❌ | text | |
| Address | ❌ | textarea | |
| National ID | ❌ | text | Unique per school (if provided) |
| Passport ID | ❌ | text | Unique per school (if provided) |
| Kebele ID | ❌ | text | Unique per school (if provided) |
| Photo | ❌ | upload | Max 5MB, JPG/PNG |

**Multiple Guardians Supported:**
- Click "Add Another Guardian"
- Repeat the smart search + create process
- One student can have unlimited guardians

### Step 4: Review & Confirm

Display summary:
- Student full name, grade, section, ID (preview)
- Photo preview
- QR code preview (auto-generated)
- Parent list with relationships

**On "Register" click, system automatically:**
1. Generate Student ID (format: `STU-{YEAR}-{SEQUENCE:05d}`)
2. Create Student record in database
3. Create or link Parent record(s)
4. Create parent_student_link records
5. Generate QR Code for student (UUID + encrypted token)
6. (Optional) Assign NFC card
7. Create Audit Log entry (STUDENT_CREATED)
8. Return complete registration response

---

## Parent Linking Rules

### Relationship Model
- **One Parent → Many Students** (unlimited)
- **One Student → Many Parents** (unlimited)
- **Unlimited linking supported**

### Duplicate Prevention
Before creating a new parent, the system searches:
```sql
SELECT * FROM parents
WHERE school_id = :school_id
  AND (
    phone_1 = :input
    OR phone_2 = :input
    OR national_id = :input
    OR passport_id = :input
    OR kebele_id = :input
    OR full_name ILIKE :input
  )
```

### Link Management
- Existing parent found → create `parent_student_link`
- New parent created → create parent record + link
- Link can be removed: `DELETE /parents/{id}/unlink`
- Primary guardian marked with `is_primary = TRUE`

---

## Auto-Generated Fields

### Student ID Format
```
STU-2026-00001
│   │      │
│   │      └── Sequential number (resets yearly)
│   └── Year of admission
└── Prefix (STU = Student)
```

### ID Prefixes
| Entity | Prefix | Example |
|--------|--------|---------|
| Student | STU | STU-2026-00001 |
| Teacher | TCH | TCH-2026-0001 |
| Staff | STF | STF-2026-0001 |
| Parent | PAR | PAR-2026-0001 |

### QR Code Data Structure
```json
{
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "encrypted_token": "<encrypted payload>",
  "reference_type": "student",
  "reference_id": "<student UUID>",
  "school_id": "<school UUID>",
  "branch_id": "<branch UUID>"
}
```

### NFC Card Data
```json
{
  "card_uid": "04:12:34:56:78:9A:BC",
  "reference_type": "student",
  "reference_id": "<student UUID>",
  "issue_date": "2026-06-22T10:30:00Z",
  "status": "active"
}
```

---

## Student Transfer Rules

- REGISTRAR can transfer students between sections within same grade
- REGISTRAR can transfer students between grades
- A transfer record is created in audit logs
- Old section/grade is recorded in old_data
- New section/grade is recorded in new_data

---

## Student Promotion Rules

- REGISTRAR can promote students at end of academic year
- Promotion creates a `promotion_records` entry
- ALL students in a grade can be promoted in bulk
- Graduating students marked as `graduated` status
- Report card is generated for promoted students

---

## Registration Audit

Every registration action is logged:

| Action | Description |
|--------|-------------|
| STUDENT_CREATED | New student registered |
| STUDENT_UPDATED | Student information modified |
| STUDENT_DELETED | Student soft-deleted |
| STUDENT_TRANSFERRED | Student moved to new class/section |
| STUDENT_PROMOTED | Student promoted to next grade |
| PARENT_CREATED | New parent created |
| PARENT_LINKED | Parent linked to student |
| PARENT_UNLINKED | Parent unlinked from student |
| QR_GENERATED | QR code created for entity |
| NFC_ASSIGNED | NFC card assigned to entity |

---

## Teacher & Staff Registration Rules

### Teacher Registration (DIRECTOR only)
- DIRECTOR creates teacher accounts
- Teacher account = User with role=TEACHER + teacher_profiles record
- Auto-generated TCH ID + QR + NFC

### Staff Registration (DIRECTOR only)
- DIRECTOR creates staff accounts for:
  - Registrar, Finance, HR, Inventory, Library, Cafeteria, Auditor
- Staff account = User with role + staff_profiles record
- Auto-generated STF ID + QR + NFC

### Temporary Password
- When creating teacher/staff accounts, system generates temporary password
- User must change password on first login
- Password sent via email/SMS if configured

---

## Validation Summary

| Rule | Enforcement |
|------|-------------|
| Only Registrar registers students | Backend permission check: `permissions.can_create_student()` |
| Teachers cannot create students | Permission denied at API level |
| No duplicate parents | Smart search before parent creation |
| No hard delete | All deletes set `deleted_at` timestamp |
| Every registration audited | `log_audit()` called after successful registration |
