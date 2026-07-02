# ZENOVA USER ROLES — MASTER SPECIFICATION

## Role Hierarchy

```
SUPER_ADMIN  (Level 100)
  │
  └── ADMIN  (Level 80)
       │
       └── DIRECTOR  (Level 60)
            │
            ├── REGISTRAR  (Level 50)
            ├── TEACHER  (Level 45)
            ├── FINANCE  (Level 50)
            ├── HR  (Level 50)
            ├── INVENTORY  (Level 50)
            ├── LIBRARY  (Level 50)
            └── CAFETERIA  (Level 50)
                 │
                 ├── AUDITOR  (Level 40)
                 │
                 ├── PARENT  (Level 20)
                 │
                 └── STUDENT  (Level 10)
```

## Role Definitions

---

### SUPER_ADMIN (Level 100)

**Full Access — All Schools, All Branches, All Modules.**

Can:
- Create schools
- Create licenses
- Activate/suspend/revoke licenses
- Create Main Admin for each school
- View every school, branch, user, transaction
- Edit everything, delete everything (soft)
- Bypass view-only restriction outside network
- Full audit logs access

Cannot:
- Be created by anyone (seeded directly via database)

---

### ADMIN (Level 80)

**School Owner — Full School Access.**

Can:
- View and manage all modules within their school
- Create Director accounts
- Manage school settings
- View all financial data
- Manage branches (if multi-branch)
- View audit logs within their school
- Approve/Reject requests

Restrictions:
- Cannot manage licenses
- Cannot access other schools
- Outside network → becomes VIEW ONLY

---

### DIRECTOR (Level 60)

**Operational Manager — Staff Management.**

Can:
- Create all operational staff accounts:
  - Registrar
  - Teacher
  - Finance
  - HR
  - Inventory
  - Library
  - Cafeteria
  - Auditor
- View all departments and their data
- View all students and teachers
- Send announcements
- Approve requests
- View academic and financial reports

Restrictions:
- Cannot create Admin accounts
- Cannot manage licenses
- Cannot delete records (soft delete only)
- Cannot access finance create/edit
- Outside network → becomes VIEW ONLY

---

### REGISTRAR (Level 50)

**Student Admissions Officer.**

Can:
- Register new students
- Register parents
- Search students and parents
- Link parents to students (smart linking)
- Generate student IDs
- Generate QR codes for students
- Assign NFC cards
- Transfer students between classes
- Promote students to next grade
- View student documents
- View registration audit history

Restrictions:
- CANNOT create teacher or staff accounts
- CANNOT access finance module
- CANNOT access HR module
- CANNOT delete student records
- Outside network → becomes VIEW ONLY

---

### TEACHER (Level 45)

**Classroom Teacher.**

Can:
- Take attendance (QR, NFC, manual)
- Enter grades for assigned students
- View assigned students only
- View own classes and sections
- View timetable
- Send messages to assigned students' parents
- View exam results for own students

Restrictions:
- CANNOT register students (Registrar only)
- CANNOT create parents
- CANNOT access finance, HR, inventory, library
- CANNOT view students outside assigned classes
- Outside network → becomes VIEW ONLY

---

### FINANCE (Level 50)

**Accounting Officer.**

Can:
- Manage Chart of Accounts
- Create journal entries (double-entry)
- Generate invoices
- Record payments
- Manage expenses
- Run payroll
- Generate financial reports:
  - Trial Balance
  - General Ledger
  - Balance Sheet
  - Income Statement
  - Cash Flow
  - Revenue Reports
  - Expense Reports
- Manage student billing and fees
- Manage scholarships
- Manage budget
- Manage procurement

Restrictions:
- Cannot access HR, Inventory, Library, Cafeteria modules
- Cannot delete financial records (reversal only)
- Cannot lock/unlock accounting periods
- Cannot approve own journal entries
- Outside network → becomes VIEW ONLY

---

### HR (Level 50)

**Human Resources Officer.**

Can:
- Manage staff records
- Create employee contracts
- Manage leave requests (approve/reject)
- Track staff attendance
- Manage payroll data (input)
- Manage training records
- View performance reviews

Restrictions:
- Cannot process payroll payments (Finance does)
- Cannot access student records
- Cannot access finance accounts
- Outside network → becomes VIEW ONLY

---

### INVENTORY (Level 50)

**Inventory Manager.**

Can:
- Manage inventory items
- Manage categories
- Track stock levels
- Create purchase orders
- Manage suppliers
- Process stock transfers
- Generate inventory reports
- QR scan for inventory tracking

Restrictions:
- Cannot access finance, HR, students
- Cannot process payments
- Outside network → becomes VIEW ONLY

---

### LIBRARY (Level 50)

**Librarian.**

Can:
- Register books
- Manage book categories and authors
- Process borrowing and returns
- Calculate and collect fines
- Generate library reports
- QR scan for book tracking
- Link books to students

Restrictions:
- Cannot access finance, HR, inventory
- Outside network → becomes VIEW ONLY

---

### CAFETERIA (Level 50)

**Cafeteria POS Operator.**

Can:
- Manage products and prices
- Process POS transactions
- Accept QR payments
- Accept NFC payments
- Accept wallet payments
- View daily sales reports
- Manage inventory (cafeteria stock only)

Restrictions:
- Cannot access main finance module
- Cannot access student registration
- Outside network → becomes VIEW ONLY

---

### AUDITOR (Level 40)

**Read-Only Inspector.**

Can:
- View all modules (read-only)
- View audit logs
- Export audit reports
- Inspect financial records
- View student records
- View staff records
- Generate inspection reports

Restrictions:
- CANNOT create, edit, or delete ANYTHING
- CANNOT approve requests
- No write access to any module
- Outside network → still VIEW ONLY (same as inside)

---

### PARENT (Level 20)

**Cloud Portal User (VPS Only).**

Can:
- View children's attendance
- View exam results
- View fee status and payments
- Top-up student wallet
- Send messages to teachers
- Receive notifications
- Update profile

Restrictions:
- Local network access: NONE (cloud only)
- Cannot register students
- Cannot view other students
- Dashboard is simplified, mobile-first

---

### STUDENT (Level 10)

**Cloud Portal User (VPS Only).**

Can:
- View own attendance
- View own grades and results
- View own timetable
- View assignments
- View wallet balance
- Receive announcements
- Update profile

Restrictions:
- Local network access: NONE (cloud only)
- Cannot view other students' data
- Cannot send messages to other students
- Dashboard is simplified, mobile-first

---

## Staff Creation Chain

```
SUPER_ADMIN
  └── Creates School + License + ADMIN

ADMIN
  └── Creates DIRECTOR(s)

DIRECTOR
  ├── Creates REGISTRAR(s)
  ├── Creates TEACHER(s)
  ├── Creates FINANCE officer(s)
  ├── Creates HR officer(s)
  ├── Creates INVENTORY officer(s)
  ├── Creates LIBRARIAN(s)
  ├── Creates CAFETERIA staff
  └── Creates AUDITOR(s)
```

## Network Security Rule

**Inside School Network:**
All roles have normal access based on their permissions.

**Outside School Network:**
The following roles become VIEW ONLY:
- ADMIN, DIRECTOR, REGISTRAR, TEACHER, FINANCE, HR, INVENTORY, LIBRARY, CAFETERIA, AUDITOR

View Only means:
- No Create
- No Update
- No Delete
- No Settings access
- View and Read only

**SUPER_ADMIN is exempt** from this restriction.
PARENT and STUDENT are cloud-only and not affected.

## Role Seed Data

| Role Name | Level | Description |
|-----------|-------|-------------|
| SUPER_ADMIN | 100 | Full system access |
| ADMIN | 80 | School owner |
| DIRECTOR | 60 | Staff management |
| REGISTRAR | 50 | Student admissions |
| TEACHER | 45 | Classroom teaching |
| FINANCE | 50 | Accounting |
| HR | 50 | Staff management |
| INVENTORY | 50 | Asset management |
| LIBRARY | 50 | Book management |
| CAFETERIA | 50 | POS operations |
| AUDITOR | 40 | Read-only inspection |
| PARENT | 20 | Parent portal |
| STUDENT | 10 | Student portal |
