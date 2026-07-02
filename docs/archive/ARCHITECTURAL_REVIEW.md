# 🔴 ZENOVA Full Stack Architectural Review Report

**Date:** June 22, 2026  
**Project:** ZENOVA - Enterprise School Management Platform  
**Reviewer:** AI Architecture Review  

---

## Executive Summary

The ZENOVA codebase demonstrates a solid foundation with proper RBAC, audit logging, and double-entry accounting. However, **critical violations** were found across all layers that must be addressed before production deployment.

**Total Issues Found:** 10 critical violations  
**High Priority:** 57 models need `deleted_at` column  
**Models with Full Compliance:** 4 (6.6%)  

---

## 🚨 CRITICAL VIOLATIONS (Must Fix Immediately)

### 1. Hard Delete Violation — `academic_service.py` Line 76

```python
db.delete(cls)
db.commit()
```

**Rule Violated:** *"No hard delete — soft delete only (deleted_at)"*

**Impact:** Class grades deleted permanently. Audit trail cannot reconstruct data. All related records (students, sections, subjects) become orphaned.

**Fix Required:**
```python
# Replace db.delete(cls) with:
cls.deleted_at = datetime.utcnow()
db.commit()
log_audit(db, user_id, "DELETE", "class", class_id, "Class grade soft deleted")
```

---

### 2. Missing `deleted_at` on 57 Models

The following models are **missing `deleted_at` soft-delete columns**:

| # | Model | File |
|---|-------|------|
| 1 | ClassGrade | class_.py |
| 2 | Section | section.py |
| 3 | Subject | subject.py |
| 4 | Classroom | classroom.py |
| 5 | TimetableEntry | timetable.py |
| 6 | ExamType | exam.py |
| 7 | Exam | exam.py |
| 8 | ExamResult | exam.py |
| 9 | AcademicYear | academic_year.py |
| 10 | Semester | academic_year.py |
| 11 | TeacherProfile | teacher_profile.py |
| 12 | StaffProfile | staff_profile.py |
| 13 | Account | account.py |
| 14 | InventoryCategory | inventory.py |
| 15 | InventoryItem | inventory.py |
| 16 | StockMovement | inventory.py |
| 17 | Supplier | inventory.py |
| 18 | BookCategory | library.py |
| 19 | Book | library.py |
| 20 | BookBorrowing | library.py |
| 21 | CafeteriaProduct | cafeteria.py |
| 22 | CafeteriaOrder | cafeteria.py |
| 23 | CafeteriaOrderItem | cafeteria.py |
| 24 | Announcement | communication.py |
| 25 | Event | event.py |
| 26 | EmployeeContract | contract.py |
| 27 | PayrollRun | payroll.py |
| 28 | PayrollItem | payroll.py |
| 29 | Budget | budget.py |
| 30 | BudgetItem | budget.py |
| 31 | PurchaseRequest | procurement.py |
| 32 | PurchaseOrder | procurement.py |
| 33 | GoodsReceipt | procurement.py |
| 34 | LeaveType | leave.py |
| 35 | LeaveRequest | leave.py |
| 36 | LeaveBalance | leave.py |
| 37 | PerformanceReview | performance.py |
| 38 | Wallet | wallet.py |
| 39 | WalletTransaction | wallet.py |
| 40 | JournalEntry | journal.py |
| 41 | JournalLine | journal.py |
| 42 | Invoice | invoice.py |
| 43 | InvoiceLine | invoice.py |
| 44 | Payment | payment.py |
| 45 | FeeType | fee.py |
| 46 | FeeStructure | fee.py |
| 47 | FeeAssignment | fee.py |
| 48 | Scholarship | scholarship.py |
| 49 | AccountingPeriod | period.py |
| 50 | ReportCard | report_card.py |
| 51 | PromotionRecord | report_card.py |
| 52 | QRCode | qr_code.py |
| 53 | NFCCard | nfc_card.py |
| 54 | NumberSequence | number_sequence.py |
| 55 | License | license.py |
| 56 | School | school.py |
| 57 | Role | role.py |

**Models with `deleted_at` (Correct):** User, Student, Parent, Branch

**Rule Violated:** *"No hard delete — soft delete only"*

**Impact:** 57 tables cannot comply with the no-hard-delete rule. Data recovery impossible.

---

### 3. Missing Audit Logging — Finance Service

**Violation:** `create_account()`, `update_account()`, `create_fee_type()`, `create_fee_structure()`, `assign_fee()` — all call `log_audit()` but with **incomplete parameters**.

```python
# Current (WRONG):
log_audit(db, user_id, "ACCOUNT_CREATED", "account", acct.id, f"Account '{data.name}' ({data.account_number}) created")

# Required signature:
log_audit(db, table_name, record_id, action, old_data, new_data, user_id, ip_address, user_agent)
```

**Impact:** Audit logs missing `old_data`, `new_data`, `ip_address`, `user_agent`. Violates *"Everything traceable — who, when, IP, device, old value, new value"*.

---

### 4. Missing Audit Logging — Academic Service

**Violation:** `create_class_grade()`, `create_section()`, `create_semester()`, `create_academic_year()` — all call `log_audit()` but with **incomplete parameters** and **missing `old_data`/`new_data`**.

---

### 5. CORS Wildcard — `main.py`

```python
allow_origins=["*"]  # DANGEROUS
```

**Rule Violated:** Cloud/Local hybrid architecture requires strict origin control.

**Impact:** Any website can make API requests on behalf of users. Token theft attacks possible.

**Fix Required:**
```python
allow_origins=[
    "http://localhost:3000",  # Local dev
    "https://cloud.zenova.app",  # Cloud portal
]
```

---

### 6. Missing Network-Based View-Only Enforcement

**Rule Violated:** *"Outside school network: Admin, Director, Registrar, Teacher, Finance, HR, Inventory, Library, Cafeteria, Auditor become View Only"*

**Current State:** The `is_view_only` flag exists on the User model but **no middleware or dependency checks it** except in `permissions.py` for a hardcoded list:

```python
# Current (WRONG - hardcoded):
if user.is_view_only and permission not in ["students.view", "audit.view"]:
    return False
```

**Impact:** Staff can mutate data outside school network. Violates hybrid architecture rules.

**Fix Required:** Implement IP range detection middleware that sets `is_view_only` based on network location.

---

### 7. Missing `school_id` Filter on Queries

Multiple service functions **do not filter by `school_id`**:

- `get_fee_structures()` — No school filter
- `get_fee_assignments()` — No school filter

**Impact:** School A can see School B's data. Complete data isolation failure.

**Fix Required:** Add `school_id` filter to ALL queries in all services.

---

### 8. Missing `deleted_at` Filter on Queries

Multiple service functions **do not filter soft-deleted records**:

- `get_accounts()` — Missing `deleted_at.is_(None)`
- `get_fee_types()` — Missing `deleted_at.is_(None)`
- `get_fee_structures()` — Missing `deleted_at.is_(None)`
- `get_fee_assignments()` — Missing `deleted_at.is_(None)`
- `get_journal_entries()` — Missing `deleted_at.is_(None)`
- `get_classes()` — Missing `deleted_at.is_(None)`
- `get_sections()` — Missing `deleted_at.is_(None)`
- `get_academic_years()` — Missing `deleted_at.is_(None)`
- `get_semesters()` — Missing `deleted_at.is_(None)`

**Impact:** Deleted records appear in queries. Data inconsistency.

---

### 9. Missing `is_active` Filter on Account Queries

`get_accounts()` queries accounts but **does not filter by `is_active`**:

```python
# Current:
return db.query(Account).filter(Account.school_id == school_id).all()

# Required:
return db.query(Account).filter(
    Account.school_id == school_id,
    Account.is_active == True,
    Account.deleted_at.is_(None),
).all()
```

---

### 10. Role Permission Missing `PARENT` and `STUDENT`

`ROLE_PERMISSIONS` dictionary **does not define** `PARENT` or `STUDENT` roles:

```python
ROLE_PERMISSIONS = {
    "SUPER_ADMIN": [...],
    "ADMIN": [...],
    # ... missing PARENT and STUDENT
}
```

**Rule Violated:** *"Parent Portal and Student Portal are cloud only"*

**Impact:** PARENT and STUDENT roles have no permissions defined. Cloud portal access will fail.

---

## 📋 COMPLETE MODEL COMPLIANCE MATRIX

### Models with Full Compliance (deleted_at + timestamps)

| Model | File | deleted_at | created_at | updated_at |
|-------|------|-----------|------------|------------|
| User | user.py | ✅ | ✅ | ✅ |
| Student | student.py | ✅ | ✅ | ✅ |
| Parent | parent.py | ✅ | ✅ | ✅ |
| Branch | branch.py | ✅ | ✅ | ✅ |

### Models with Partial Compliance (timestamps only)

| Model | File | deleted_at | created_at | updated_at |
|-------|------|-----------|------------|------------|
| TeacherProfile | teacher_profile.py | ❌ | ✅ | ✅ |
| StaffProfile | staff_profile.py | ❌ | ✅ | ✅ |
| Account | account.py | ❌ | ✅ | ✅ |
| License | license.py | ❌ | ✅ | ✅ |
| School | school.py | ❌ | ✅ | ✅ |
| Role | role.py | ❌ | ✅ | ✅ |
| Wallet | wallet.py | ❌ | ✅ | ✅ |
| InventoryItem | inventory.py | ❌ | ❌ | ✅ |
| JournalEntry | journal.py | ❌ | ✅ | ❌ |
| AuditLog | audit_log.py | ❌ | ✅ | ❌ |

### Models with No Compliance (missing all)

| Model | File |
|-------|------|
| ClassGrade | class_.py |
| Section | section.py |
| Subject | subject.py |
| Classroom | classroom.py |
| TimetableEntry | timetable.py |
| ExamType | exam.py |
| Exam | exam.py |
| ExamResult | exam.py |
| AcademicYear | academic_year.py |
| Semester | academic_year.py |
| InventoryCategory | inventory.py |
| StockMovement | inventory.py |
| Supplier | inventory.py |
| BookCategory | library.py |
| Book | library.py |
| BookBorrowing | library.py |
| CafeteriaProduct | cafeteria.py |
| CafeteriaOrder | cafeteria.py |
| CafeteriaOrderItem | cafeteria.py |
| Announcement | communication.py |
| Event | event.py |
| EmployeeContract | contract.py |
| PayrollRun | payroll.py |
| PayrollItem | payroll.py |
| Budget | budget.py |
| BudgetItem | budget.py |
| PurchaseRequest | procurement.py |
| PurchaseOrder | procurement.py |
| GoodsReceipt | procurement.py |
| LeaveType | leave.py |
| LeaveRequest | leave.py |
| LeaveBalance | leave.py |
| PerformanceReview | performance.py |
| WalletTransaction | wallet.py |
| JournalLine | journal.py |
| Invoice | invoice.py |
| InvoiceLine | invoice.py |
| Payment | payment.py |
| FeeType | fee.py |
| FeeStructure | fee.py |
| FeeAssignment | fee.py |
| Scholarship | scholarship.py |
| AccountingPeriod | period.py |
| ReportCard | report_card.py |
| PromotionRecord | report_card.py |
| QRCode | qr_code.py |
| NFCCard | nfc_card.py |
| NumberSequence | number_sequence.py |
| ParentStudentLink | parent_student_link.py |
| Notification | communication.py |
| Attendance | attendance.py |

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Add `deleted_at` to All Models

```python
from datetime import datetime
from sqlalchemy import Column, DateTime

class ClassGrade(Base):
    # ... existing columns ...
    deleted_at = Column(DateTime, nullable=True)
```

### Priority 2: Fix Hard Delete in academic_service.py

```python
def delete_class_grade(db: Session, class_id: str, user_id: str):
    cls = db.query(ClassGrade).filter(ClassGrade.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    cls.deleted_at = datetime.utcnow()  # Replace: db.delete(cls)
    db.commit()
    log_audit(db, user_id, "DELETE", "class", class_id, "Class grade soft deleted")
```

### Priority 3: Fix CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://cloud.zenova.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Priority 4: Add school_id Filter to All Queries

```python
def get_fee_structures(db: Session, fee_type_id: str = None, school_id: str = None):
    q = db.query(FeeStructure)
    if fee_type_id:
        q = q.filter(FeeStructure.fee_type_id == fee_type_id)
    if school_id:
        q = q.filter(FeeStructure.school_id == school_id)
    return q.all()
```

### Priority 5: Add deleted_at Filter to All Queries

```python
def get_accounts(db: Session, school_id: str):
    return db.query(Account).filter(
        Account.school_id == school_id,
        Account.is_active == True,
        Account.deleted_at.is_(None),
    ).all()
```

### Priority 6: Fix Audit Logging

```python
def create_account(db: Session, school_id: str, data, user_id: str, ip_address: str = None, user_agent: str = None):
    # ... existing code ...
    log_audit(
        db=db,
        table_name="accounts",
        record_id=acct.id,
        action="ACCOUNT_CREATED",
        old_data=None,
        new_data={"account_number": data.account_number, "name": data.name},
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return acct
```

### Priority 7: Add PARENT and STUDENT Permissions

```python
ROLE_PERMISSIONS = {
    # ... existing roles ...
    "PARENT": [
        "students.view",
        "attendance.view",
        "grades.view",
        "reports.view",
        "messages.view",
        "messages.create",
    ],
    "STUDENT": [
        "students.view.self",
        "attendance.view.self",
        "grades.view.self",
        "reports.view.self",
        "messages.view",
        "messages.create",
    ],
}
```

---

## 📊 SUMMARY STATISTICS

| Category | Count |
|----------|-------|
| Total Models | 61 |
| Models with full compliance | 4 (6.6%) |
| Models with partial compliance | 10 (16.4%) |
| Models with no compliance | 47 (77%) |
| Critical violations | 10 |

---

## ✅ WHAT'S WORKING WELL

1. **User Model** — Proper soft-delete with `deleted_at`, timestamps, and all required fields
2. **Student Model** — Full compliance with audit requirements
3. **Parent Model** — Proper soft-delete implementation
4. **Branch Model** — Full compliance
5. **RBAC System** — Well-structured role-based access control
6. **Audit Logging** — Core infrastructure in place (needs parameter fixes)
7. **Double-Entry Accounting** — Proper debit/credit validation in journal entries
8. **Token Authentication** — JWT with access/refresh token separation
9. **Middleware** — Proper authentication middleware with dependency injection
10. **Frontend Navigation** — Role-based menu filtering working correctly

---

## 🚀 NEXT STEPS

1. **Immediate:** Fix hard delete in `academic_service.py`
2. **Immediate:** Fix CORS configuration
3. **This Week:** Add `deleted_at` to all 57 missing models
4. **This Week:** Add `school_id` filter to all queries
5. **This Week:** Fix audit logging parameter signatures
6. **This Week:** Add PARENT and STUDENT role permissions
7. **This Week:** Add `deleted_at` filter to all query functions
8. **This Week:** Add `is_active` filter to account queries
9. **Ongoing:** Add timestamps to models missing them
10. **Ongoing:** Implement network-based view-only enforcement

---

*Report generated on June 22, 2026*