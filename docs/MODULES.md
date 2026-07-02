# Module Guide

## Academic Management

Models: `AcademicYear`, `Semester`, `Class` (grade), `Section`, `Subject`, `Classroom`, `TimetableEntry`, `ExamType`, `Exam`, `ExamResult`, `ReportCard`, `PromotionRecord`

### Key Rules
- Academic years define the calendar; one year can be `is_current`
- Classes (grades) have sections for student grouping
- Subjects assigned per class
- Timetable entries link class, section, subject, day, period
- Exam results store scores; grade computation in `app/utils/grading.py`
- Promotion moves students between grades at year-end
- Cumulative transcript endpoint at `/students/{id}/transcript`

### Grade Computation
Single source of truth in `app/utils/grading.py`. Imported by `report_cards.py` and `students.py` (fix applied June 29).

### Known Gaps
- No promotion prerequisites enforcement
- No class capacity limits
- No teacher workload limits
- No exam scheduling conflict detection
- Grade is free-text; no enforced score-to-grade mapping

## Human Resources

Models: `EmployeeContract`, `LeaveType`, `LeaveRequest`, `LeaveBalance`, `PerformanceReview`, `Recruitment`

### Key Rules
- DIRECTOR creates teacher and staff accounts
- Contracts track employment terms
- Leave requests with balance tracking
- Performance reviews on schedule

### Known Gaps
- No contract overlap prevention
- No leave balance negative enforcement
- Teachers can't mark own attendance (not enforced in code)

## Inventory Management

Models: `InventoryCategory`, `InventoryItem`, `StockMovement`, `Supplier`, `Asset`

### Features
- Categories organize items hierarchically
- Stock movements track in/out/transfer
- Purchase orders from suppliers
- Fixed asset tracking
- Barcode/QR support

## Library Management

Models: `BookCategory`, `Book` (ISBN), `BookBorrowing`, `BookFine`, `LibraryMember`

### Features
- ISBN-based book catalog
- Check-out / check-in workflow
- Fine assessment on late returns
- Member history tracking
- QR code support for books

### Known Gaps
- No borrowing limit enforcement per member
- No automatic fine accrual (static fine amounts)
- No borrow-date vs return-date validation

## Cafeteria POS

Models: `CafeteriaProduct`, `CafeteriaOrder`, `CafeteriaOrderItem`

### Features
- Product catalog with pricing
- Order creation and management (PATCH for updates)
- QR/NFC wallet payments
- Daily sales tracking
- Offline-first capable

### Integration
- Payments via Student Wallet
- Stock auto-decrement not implemented
- `CafeteriaOrder.total` stored independently from order items sum (drift risk)

## Communication

Models: `Announcement`, `Event`, `Message`, `NotificationPreference`

### Features
- Internal messaging between users
- Announcements (school-wide or targeted)
- Events calendar
- Read receipts for messages

### Integration Status
- Email: toggle exists, no backend wiring
- SMS: toggle exists, no backend wiring
- Telegram: not wired
- WebSocket notifications: not implemented (30s polling used)

## Analytics & Reports

### Dashboard Analytics
- Grade distribution (single aggregate query — N+1 fix applied)
- Staff distribution by role
- KPI metrics per dashboard

### Module Reports
System, Admin, Finance (9 reports), HR, Inventory, Library, Auditor, Cafeteria

### Export Center
Data export at `/admin/exports` (attendance export implemented)

## Phase Status Reference

| Module | Backend | Frontend | Known Issues |
|--------|---------|----------|-------------|
| Academic | ✅ 289 routes | ✅ All dashboards | See REVIEWS.md |
| HR | ✅ Complete | ✅ Complete | Contract/leave gaps |
| Inventory | ✅ Complete | ✅ Complete | Minor |
| Library | ✅ Complete | ✅ Complete | Fine accrual missing |
| Cafeteria | ✅ Complete | ✅ Complete | Stock/order total drift |
| Communication | ✅ CRUD | ✅ Pages | No real notifications |
| Analytics | ✅ Phase 8.2 | ✅ Phase 8.2 | More BI needed |
