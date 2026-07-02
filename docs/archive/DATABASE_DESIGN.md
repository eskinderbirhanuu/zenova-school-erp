# ZENOVA DATABASE DESIGN — COMPLETE SCHEMA

## Core System

### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | VARCHAR(255) UNIQUE | Login credential |
| hashed_password | VARCHAR(255) | bcrypt hash |
| full_name | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| photo_url | VARCHAR(500) | Nullable |
| is_active | BOOLEAN | Default TRUE |
| is_superuser | BOOLEAN | Default FALSE |
| is_view_only | BOOLEAN | Default FALSE (set by middleware) |
| must_change_password | BOOLEAN | Default FALSE |
| last_login_at | DATETIME | Nullable |
| role_id | UUID FK → roles.id | |
| school_id | UUID FK → schools.id | |
| branch_id | UUID FK → branches.id | |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | Nullable (soft delete) |

### roles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) UNIQUE | SUPER_ADMIN, ADMIN, DIRECTOR, etc. |
| level | INTEGER | 100, 80, 60, 50, 45, 40, 20, 10 |
| description | TEXT | |
| is_active | BOOLEAN | Default TRUE |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### permissions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| code | VARCHAR(100) UNIQUE | e.g., "students.create", "finance.read" |
| name | VARCHAR(255) | |
| module | VARCHAR(100) | students, finance, hr, etc. |
| description | TEXT | |
| created_at | DATETIME | |

### role_permissions
| Column | Type | Notes |
|--------|------|-------|
| role_id | UUID FK → roles.id | |
| permission_id | UUID FK → permissions.id | |
| is_granted | BOOLEAN | Default TRUE |
| PK | (role_id, permission_id) | |

### schools
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| code | VARCHAR(50) UNIQUE | Short code |
| address | TEXT | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| logo_url | VARCHAR(500) | |
| website | VARCHAR(255) | |
| settings | JSONB | School configuration |
| is_active | BOOLEAN | Default TRUE |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | |

### branches
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| code | VARCHAR(50) | |
| address | TEXT | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| school_id | UUID FK → schools.id | |
| is_active | BOOLEAN | Default TRUE |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | |

### licenses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| key | VARCHAR(255) UNIQUE | License key |
| license_type | ENUM | trial, monthly, yearly, lifetime |
| status | ENUM | active, expired, suspended, revoked |
| school_id | UUID FK → schools.id | Nullable |
| branch_id | UUID FK → branches.id | Nullable |
| valid_from | DATETIME | |
| valid_until | DATETIME | Nullable (lifetime) |
| max_users | VARCHAR(50) | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

---

## Identity & Registration

### students
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | VARCHAR(50) UNIQUE | STU-2026-00001 |
| first_name | VARCHAR(100) | |
| middle_name | VARCHAR(100) | |
| last_name | VARCHAR(100) | |
| gender | VARCHAR(10) | male, female |
| date_of_birth | DATE | |
| grade_id | UUID FK → classes.id | |
| section_id | UUID FK → sections.id | |
| academic_year_id | UUID FK → academic_years.id | |
| address | TEXT | |
| nationality | VARCHAR(100) | |
| blood_group | VARCHAR(10) | |
| photo_url | VARCHAR(500) | |
| emergency_contact | VARCHAR(50) | |
| admission_date | DATE | |
| status | VARCHAR(20) | active, transferred, graduated, withdrawn |
| school_id | UUID FK → schools.id | |
| branch_id | UUID FK → branches.id | |
| registered_by | UUID FK → users.id | Registrar who registered |
| user_id | UUID FK → users.id | Nullable (for student portal) |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | |

### parents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| parent_id | VARCHAR(50) UNIQUE | PAR-2026-00001 |
| full_name | VARCHAR(255) | |
| relationship | VARCHAR(50) | father, mother, guardian, other |
| phone_1 | VARCHAR(50) | |
| phone_2 | VARCHAR(50) | |
| occupation | VARCHAR(100) | |
| address | TEXT | |
| national_id | VARCHAR(100) | |
| passport_id | VARCHAR(100) | |
| kebele_id | VARCHAR(100) | |
| photo_url | VARCHAR(500) | |
| school_id | UUID FK → schools.id | |
| user_id | UUID FK → users.id | Nullable (for parent portal) |
| created_at | DATETIME | |
| updated_at | DATETIME | |
| deleted_at | DATETIME | |

### parent_student_links
| Column | Type | Notes |
|--------|------|-------|
| parent_id | UUID FK → parents.id | |
| student_id | UUID FK → students.id | |
| relationship | VARCHAR(50) | Override per link |
| is_primary | BOOLEAN | Default FALSE |
| created_at | DATETIME | |
| PK | (parent_id, student_id) | |

### teacher_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | UNIQUE |
| teacher_id | VARCHAR(50) UNIQUE | TCH-2026-00001 |
| qualification | VARCHAR(255) | |
| department | VARCHAR(255) | |
| employment_date | DATE | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### teacher_grade_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| teacher_id | UUID FK → teacher_profiles.id | |
| grade_id | UUID FK → classes.id | |
| UNIQUE | (teacher_id, grade_id) | |

### teacher_section_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| teacher_id | UUID FK → teacher_profiles.id | |
| section_id | UUID FK → sections.id | |
| UNIQUE | (teacher_id, section_id) | |

### staff_profiles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | UNIQUE |
| staff_id | VARCHAR(50) UNIQUE | STF-2026-00001 |
| department | VARCHAR(255) | |
| employment_date | DATE | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### number_sequences
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| prefix | VARCHAR(20) | STU, TCH, STF, PAR |
| school_id | UUID FK → schools.id | |
| year | INTEGER | |
| last_number | INTEGER | |
| UNIQUE | (prefix, school_id, year) | |

### qr_codes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| uuid | VARCHAR(36) UNIQUE | Public identifier |
| encrypted_token | VARCHAR(500) | Encrypted payload |
| reference_type | VARCHAR(50) | student, parent, teacher, staff |
| reference_id | VARCHAR(36) | UUID of referenced entity |
| school_id | UUID FK → schools.id | |
| branch_id | UUID FK → branches.id | |
| is_active | BOOLEAN | Default TRUE |
| created_at | DATETIME | |
| expires_at | DATETIME | Nullable |
| INDEX | (reference_type, reference_id) | |

### nfc_cards
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| card_uid | VARCHAR(100) UNIQUE | Hardware UID |
| reference_type | VARCHAR(50) | student, teacher, staff |
| reference_id | VARCHAR(36) | UUID of assigned person |
| issue_date | DATETIME | |
| expiry_date | DATETIME | Nullable |
| status | VARCHAR(20) | active, expired, revoked, lost |
| school_id | UUID FK → schools.id | |
| assigned_by | UUID FK → users.id | |
| created_at | DATETIME | |

---

## Academic Structure

### academic_years
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | 2025/2026 |
| start_date | DATE | |
| end_date | DATE | |
| is_current | BOOLEAN | Default FALSE |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### semesters
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | Semester 1, Semester 2 |
| academic_year_id | UUID FK → academic_years.id | |
| start_date | DATE | |
| end_date | DATE | |
| created_at | DATETIME | |

### classes (grades)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | Grade 1, Grade 5, etc. |
| code | VARCHAR(50) | G01, G05 |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### sections
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | A, B, C |
| class_id | UUID FK → classes.id | |
| capacity | INTEGER | Max students |
| created_at | DATETIME | |

### subjects
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | Mathematics, English, etc. |
| code | VARCHAR(50) | MATH, ENG |
| class_id | UUID FK → classes.id | |
| is_optional | BOOLEAN | Default FALSE |
| created_at | DATETIME | |

### classrooms
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | Room 101 |
| capacity | INTEGER | |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### timetable_entries
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| day_of_week | INTEGER | 0=Monday, 6=Sunday |
| start_time | TIME | |
| end_time | TIME | |
| subject_id | UUID FK → subjects.id | |
| teacher_id | UUID FK → teacher_profiles.id | |
| section_id | UUID FK → sections.id | |
| classroom_id | UUID FK → classrooms.id | |
| created_at | DATETIME | |

### exam_types
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | Midterm, Final, Quiz |
| weight | DECIMAL(5,2) | Percentage weight |
| created_at | DATETIME | |

### exams
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| exam_type_id | UUID FK → exam_types.id | |
| subject_id | UUID FK → subjects.id | |
| class_id | UUID FK → classes.id | |
| semester_id | UUID FK → semesters.id | |
| date | DATE | |
| max_score | DECIMAL(10,2) | |
| created_at | DATETIME | |

### exam_results
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| exam_id | UUID FK → exams.id | |
| student_id | UUID FK → students.id | |
| score | DECIMAL(10,2) | |
| grade | VARCHAR(10) | A, B, C, etc. |
| remarks | TEXT | |
| entered_by | UUID FK → users.id | |
| created_at | DATETIME | |
| UNIQUE | (exam_id, student_id) | |

### report_cards
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | UUID FK → students.id | |
| semester_id | UUID FK → semesters.id | |
| academic_year_id | UUID FK → academic_years.id | |
| pdf_url | VARCHAR(500) | |
| generated_at | DATETIME | |
| created_at | DATETIME | |

### promotion_records
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | UUID FK → students.id | |
| from_class_id | UUID FK → classes.id | |
| to_class_id | UUID FK → classes.id | |
| academic_year_id | UUID FK → academic_years.id | |
| promoted_by | UUID FK → users.id | |
| created_at | DATETIME | |

---

## Finance System

### account_types
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | Asset, Liability, Equity, Revenue, Expense |
| code | VARCHAR(10) | 1, 2, 3, 4, 5 |
| normal_side | VARCHAR(10) | debit, credit |
| created_at | DATETIME | |

### finance_accounts (Chart of Accounts)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| account_code | VARCHAR(50) | 1-1000, 1-2000, etc. |
| name | VARCHAR(255) | |
| description | TEXT | |
| account_type_id | UUID FK → account_types.id | |
| parent_id | UUID FK → finance_accounts.id | For sub-accounts |
| is_active | BOOLEAN | Default TRUE |
| balance | DECIMAL(15,2) | Current balance |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### journal_entries
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| entry_number | VARCHAR(50) | JE-2026-00001 |
| description | TEXT | |
| entry_date | DATE | |
| period_id | UUID FK → periods.id | |
| is_reversal | BOOLEAN | Default FALSE |
| reversed_entry_id | UUID FK → journal_entries.id | Nullable |
| status | VARCHAR(20) | draft, posted, reversed |
| approved_by | UUID FK → users.id | Nullable |
| created_by | UUID FK → users.id | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### journal_entry_lines
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| journal_entry_id | UUID FK → journal_entries.id | |
| account_id | UUID FK → finance_accounts.id | |
| debit | DECIMAL(15,2) | Default 0 |
| credit | DECIMAL(15,2) | Default 0 |
| description | TEXT | |
| created_at | DATETIME | |

### ledger_entries
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| account_id | UUID FK → finance_accounts.id | |
| journal_entry_id | UUID FK → journal_entries.id | |
| entry_date | DATE | |
| debit | DECIMAL(15,2) | |
| credit | DECIMAL(15,2) | |
| balance | DECIMAL(15,2) | Running balance |
| description | TEXT | |
| created_at | DATETIME | |

### periods
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(100) | June 2026 |
| start_date | DATE | |
| end_date | DATE | |
| fiscal_year_id | UUID FK → fiscal_years.id | |
| is_locked | BOOLEAN | Default FALSE |
| locked_at | DATETIME | Nullable |
| locked_by | UUID FK → users.id | Nullable |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### fee_structures
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | Tuition Fee, Admission Fee |
| fee_type | VARCHAR(50) | tuition, admission, transport, library, cafeteria, exam, custom |
| amount | DECIMAL(15,2) | |
| frequency | VARCHAR(50) | annual, semester, monthly, one-time |
| class_id | UUID FK → classes.id | Nullable (all classes) |
| is_mandatory | BOOLEAN | Default TRUE |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### fee_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | UUID FK → students.id | |
| fee_structure_id | UUID FK → fee_structures.id | |
| amount | DECIMAL(15,2) | Override if needed |
| academic_year_id | UUID FK → academic_years.id | |
| is_waived | BOOLEAN | Default FALSE |
| waiver_reason | TEXT | |
| created_at | DATETIME | |

### invoices
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_number | VARCHAR(50) UNIQUE | INV-2026-00001 |
| student_id | UUID FK → students.id | |
| academic_year_id | UUID FK → academic_years.id | |
| semester_id | UUID FK → semesters.id | Nullable |
| issue_date | DATE | |
| due_date | DATE | |
| total_amount | DECIMAL(15,2) | |
| paid_amount | DECIMAL(15,2) | Default 0 |
| balance | DECIMAL(15,2) | |
| status | VARCHAR(20) | draft, issued, partial, paid, cancelled, overdue |
| notes | TEXT | |
| issued_by | UUID FK → users.id | |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### invoice_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| invoice_id | UUID FK → invoices.id | |
| fee_structure_id | UUID FK → fee_structures.id | |
| description | VARCHAR(255) | |
| amount | DECIMAL(15,2) | |
| created_at | DATETIME | |

### receipts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| receipt_number | VARCHAR(50) UNIQUE | RCP-2026-00001 |
| invoice_id | UUID FK → invoices.id | |
| payment_id | UUID FK → payments.id | |
| receipt_date | DATE | |
| amount | DECIMAL(15,2) | |
| pdf_url | VARCHAR(500) | |
| created_at | DATETIME | |

### payments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payment_number | VARCHAR(50) UNIQUE | PAY-2026-00001 |
| student_id | UUID FK → students.id | |
| payment_date | DATE | |
| amount | DECIMAL(15,2) | |
| payment_method | VARCHAR(50) | cash, bank, mobile_money, telebirr, cbe_birr, wallet, mixed |
| reference_number | VARCHAR(255) | Transaction reference |
| status | VARCHAR(20) | pending, completed, failed, refunded |
| recorded_by | UUID FK → users.id | |
| journal_entry_id | UUID FK → journal_entries.id | Link to double-entry |
| notes | TEXT | |
| created_at | DATETIME | |

### expenses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| expense_number | VARCHAR(50) UNIQUE | EXP-2026-00001 |
| description | TEXT | |
| amount | DECIMAL(15,2) | |
| expense_date | DATE | |
| category_id | UUID FK → expense_categories.id | |
| department | VARCHAR(100) | |
| approved_by | UUID FK → users.id | Nullable |
| status | VARCHAR(20) | draft, pending, approved, paid |
| journal_entry_id | UUID FK → journal_entries.id | |
| created_by | UUID FK → users.id | |
| created_at | DATETIME | |

### budgets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| fiscal_year_id | UUID FK → fiscal_years.id | |
| department | VARCHAR(100) | |
| total_amount | DECIMAL(15,2) | |
| status | VARCHAR(20) | draft, active, closed |
| approved_by | UUID FK → users.id | |
| created_at | DATETIME | |

### scholarships
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| type | VARCHAR(50) | full, partial, discount |
| discount_percentage | DECIMAL(5,2) | For partial/discount |
| description | TEXT | |
| is_active | BOOLEAN | Default TRUE |
| created_at | DATETIME | |

### scholarship_assignments
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| student_id | UUID FK → students.id | |
| scholarship_id | UUID FK → scholarships.id | |
| academic_year_id | UUID FK → academic_years.id | |
| approved_by | UUID FK → users.id | |
| created_at | DATETIME | |

### payroll_records
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payroll_number | VARCHAR(50) UNIQUE | PR-2026-00001 |
| period_name | VARCHAR(100) | June 2026 |
| total_gross | DECIMAL(15,2) | |
| total_deductions | DECIMAL(15,2) | |
| total_net | DECIMAL(15,2) | |
| status | VARCHAR(20) | draft, approved, paid |
| approved_by | UUID FK → users.id | |
| processed_by | UUID FK → users.id | |
| journal_entry_id | UUID FK → journal_entries.id | |
| created_at | DATETIME | |

### payslips
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| payroll_id | UUID FK → payroll_records.id | |
| user_id | UUID FK → users.id | |
| gross_salary | DECIMAL(15,2) | |
| allowances | DECIMAL(15,2) | |
| bonuses | DECIMAL(15,2) | |
| deductions | DECIMAL(15,2) | |
| tax | DECIMAL(15,2) | |
| net_pay | DECIMAL(15,2) | |
| pdf_url | VARCHAR(500) | |
| created_at | DATETIME | |

---

## Wallet System

### wallets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| student_id | UUID FK → students.id | Nullable |
| balance | DECIMAL(15,2) | Default 0 |
| status | VARCHAR(20) | active, frozen, closed |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### wallet_transactions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| wallet_id | UUID FK → wallets.id | |
| type | VARCHAR(50) | topup, payment, refund, withdrawal |
| amount | DECIMAL(15,2) | Positive=credit, Negative=debit |
| balance_before | DECIMAL(15,2) | |
| balance_after | DECIMAL(15,2) | |
| reference_type | VARCHAR(50) | invoice, cafeteria, manual |
| reference_id | VARCHAR(36) | |
| payment_method | VARCHAR(50) | |
| created_by | UUID FK → users.id | |
| created_at | DATETIME | |

---

## Inventory System

### inventory_categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| description | TEXT | |
| created_at | DATETIME | |

### inventory_items
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_code | VARCHAR(50) | |
| name | VARCHAR(255) | |
| description | TEXT | |
| category_id | UUID FK → inventory_categories.id | |
| unit | VARCHAR(50) | pcs, kg, liter |
| quantity | DECIMAL(15,2) | Current stock |
| min_quantity | DECIMAL(15,2) | Reorder level |
| unit_price | DECIMAL(15,2) | |
| location | VARCHAR(255) | |
| is_consumable | BOOLEAN | |
| photo_url | VARCHAR(500) | |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### suppliers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| contact_person | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| email | VARCHAR(255) | |
| address | TEXT | |
| created_at | DATETIME | |

### purchase_orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_number | VARCHAR(50) UNIQUE | |
| supplier_id | UUID FK → suppliers.id | |
| order_date | DATE | |
| expected_date | DATE | |
| status | VARCHAR(20) | draft, approved, sent, received, cancelled |
| total_amount | DECIMAL(15,2) | |
| approved_by | UUID FK → users.id | |
| created_by | UUID FK → users.id | |
| created_at | DATETIME | |

### stock_movements
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| item_id | UUID FK → inventory_items.id | |
| type | VARCHAR(50) | in, out, transfer |
| quantity | DECIMAL(15,2) | |
| reference_type | VARCHAR(50) | purchase, transfer, adjustment |
| reference_id | UUID | |
| from_location | VARCHAR(255) | |
| to_location | VARCHAR(255) | |
| performed_by | UUID FK → users.id | |
| created_at | DATETIME | |

---

## Library System

### authors
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| created_at | DATETIME | |

### books
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| isbn | VARCHAR(20) | |
| title | VARCHAR(255) | |
| author_id | UUID FK → authors.id | |
| category | VARCHAR(100) | |
| publisher | VARCHAR(255) | |
| published_year | INTEGER | |
| total_copies | INTEGER | |
| available_copies | INTEGER | |
| created_at | DATETIME | |

### borrowings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| book_id | UUID FK → books.id | |
| student_id | UUID FK → students.id | |
| borrowed_date | DATE | |
| due_date | DATE | |
| returned_date | DATE | Nullable |
| status | VARCHAR(20) | active, returned, overdue |
| issued_by | UUID FK → users.id | |
| created_at | DATETIME | |

### fines
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| borrowing_id | UUID FK → borrowings.id | |
| amount | DECIMAL(10,2) | |
| days_overdue | INTEGER | |
| is_paid | BOOLEAN | Default FALSE |
| paid_at | DATETIME | Nullable |
| created_at | DATETIME | |

---

## Cafeteria System

### cafeteria_products
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| price | DECIMAL(10,2) | |
| category_id | UUID FK → inventory_categories.id | |
| is_available | BOOLEAN | Default TRUE |
| photo_url | VARCHAR(500) | |
| created_at | DATETIME | |

### cafeteria_orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_number | VARCHAR(50) | |
| student_id | UUID FK → students.id | Nullable |
| total_amount | DECIMAL(15,2) | |
| payment_method | VARCHAR(50) | qr, nfc, wallet, cash |
| status | VARCHAR(20) | pending, completed, cancelled |
| processed_by | UUID FK → users.id | |
| created_at | DATETIME | |

### cafeteria_transactions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| order_id | UUID FK → cafeteria_orders.id | |
| wallet_transaction_id | UUID FK → wallet_transactions.id | Nullable |
| amount | DECIMAL(15,2) | |
| payment_method | VARCHAR(50) | |
| created_at | DATETIME | |

---

## HR System

### hr_contracts
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| type | VARCHAR(50) | permanent, temporary, contract |
| start_date | DATE | |
| end_date | DATE | Nullable |
| salary | DECIMAL(15,2) | |
| created_at | DATETIME | |

### hr_leave_requests
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| leave_type | VARCHAR(50) | annual, sick, personal, maternity |
| start_date | DATE | |
| end_date | DATE | |
| days | INTEGER | |
| reason | TEXT | |
| status | VARCHAR(20) | pending, approved, rejected, cancelled |
| approved_by | UUID FK → users.id | Nullable |
| created_at | DATETIME | |

### staff_attendance
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| date | DATE | |
| check_in | DATETIME | |
| check_out | DATETIME | Nullable |
| status | VARCHAR(20) | present, late, absent, half_day |
| created_at | DATETIME | |

---

## Transport System

### buses
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| plate_number | VARCHAR(50) | |
| capacity | INTEGER | |
| driver_id | UUID FK → drivers.id | |
| route_id | UUID FK → routes.id | |
| status | VARCHAR(20) | active, maintenance, inactive |
| created_at | DATETIME | |

### drivers
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| full_name | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| license_number | VARCHAR(100) | |
| created_at | DATETIME | |

### routes
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR(255) | |
| description | TEXT | |
| created_at | DATETIME | |

---

## Messaging System

### conversations
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| type | VARCHAR(20) | individual, group |
| subject | VARCHAR(255) | |
| created_at | DATETIME | |

### messages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID FK → conversations.id | |
| sender_id | UUID FK → users.id | |
| content | TEXT | |
| sent_at | DATETIME | |
| read_at | DATETIME | Nullable |

### announcements
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| title | VARCHAR(255) | |
| content | TEXT | |
| audience | VARCHAR(50) | all, teachers, parents, students |
| created_by | UUID FK → users.id | |
| created_at | DATETIME | |

---

## Document System

### documents
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| type | VARCHAR(50) | certificate, transcript, letter |
| student_id | UUID FK → students.id | |
| title | VARCHAR(255) | |
| pdf_url | VARCHAR(500) | |
| verification_code | VARCHAR(100) UNIQUE | |
| issued_by | UUID FK → users.id | |
| issued_date | DATE | |
| created_at | DATETIME | |

---

## Audit System

### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| table_name | VARCHAR(100) | |
| record_id | VARCHAR(36) | |
| action | VARCHAR(50) | CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, LOGOUT, EXPORT, PRINT |
| module | VARCHAR(100) | |
| old_data | JSONB | |
| new_data | JSONB | |
| user_id | UUID FK → users.id | |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| school_id | UUID FK → schools.id | |
| created_at | DATETIME | |

### login_audit
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users.id | |
| action | VARCHAR(20) | login, logout, failed |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| created_at | DATETIME | |

---

## System

### system_settings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| key | VARCHAR(100) UNIQUE | |
| value | JSONB | |
| school_id | UUID FK → schools.id | Nullable (global) |
| updated_at | DATETIME | |

### sync_queue
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| entity_type | VARCHAR(100) | |
| entity_id | UUID | |
| action | VARCHAR(50) | create, update, delete |
| data | JSONB | |
| status | VARCHAR(20) | pending, synced, failed |
| retry_count | INTEGER | Default 0 |
| error_message | TEXT | |
| created_at | DATETIME | |
| synced_at | DATETIME | Nullable |

---

## Total Tables: ~65
