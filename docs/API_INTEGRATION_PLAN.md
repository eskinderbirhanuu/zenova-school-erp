# API Integration Plan — Mock to Real Backend

## Goal
Replace all `setTimeout` + hardcoded-data mock patterns with real backend API calls across ~50 frontend pages.

## Core Conversion Pattern

```tsx
// BEFORE (Mock)
useEffect(() => {
  setTimeout(() => {
    setItems(hardcodedArray)
    setLoading(false)
  }, 500)
}, [])

// AFTER (Real API)
useEffect(() => { fetchData() }, [])

async function fetchData() {
  setLoading(true); setError(null)
  try {
    const res = await service.list(params)
    setItems(res.data)
  } catch (err: any) {
    setError(err.response?.data?.detail || err.message)
  } finally {
    setLoading(false)
  }
}
```

Each converted page also gets: loading spinner, error toast/alert, empty state.

## Status — COMPLETED: 50/50 pages on real API (2 static by design)
- All pages connected to real backend endpoints
- admin/settings is a static form — no endpoint needed
- All 21 new/improved backend endpoints built
- All 7 finance security fixes applied (audit params, auto-post GL, idempotency, concurrency lock, wallet GL, over-payment block, period locking)
- Zero TypeScript errors on build

### ✓ Super Admin (8/8)
- [x] `schools/page.tsx` — schoolService (GET /schools route created)
- [x] `branches/page.tsx` — branchService.list() (GET /branches route created)
- [x] `licenses/page.tsx` — licenseService.list()
- [x] `users/page.tsx` — api.get("/users")
- [x] `admins/page.tsx` — api.get("/users") filtered by role
- [x] `audit/page.tsx` — auditService.list() (GET /audit-logs route created)
- [x] `support/page.tsx` — api.get("/support/tickets") (endpoint created)
- [x] `reports/page.tsx` — api.get("/reports/system") (endpoint created)

### ✓ Director (7/7)
- [x] `finance/page.tsx`, `hr/page.tsx`, `library/page.tsx`, `inventory/page.tsx`, `cafeteria/page.tsx` — respective services
- [x] `staff/page.tsx` — staffService.list()
- [x] `registrars/page.tsx` — api.get("/users")
- [x] `registrars/new/page.tsx` — staffService.create()
- [x] `staff/new/page.tsx` — staffService.create()
- [x] `teachers/new/page.tsx` — teacherService.create()

### ✓ HR (4/4)
- [x] attendance/page.tsx — hrService.attendance.list()
- [x] recruitment/page.tsx — api.get("/recruitment")
- [x] performance/page.tsx — api.get("/performance-reviews")
- [x] reports/page.tsx — api.get("/reports/hr")

### ✓ Inventory (5/5)
- [x] transfers/page.tsx — inventoryService.stockMovements.list()
- [x] suppliers/page.tsx — inventoryService.suppliers.list()
- [x] purchases/page.tsx — inventoryService.stockMovements.list()
- [x] assets/page.tsx — api.get("/inventory/assets")
- [x] reports/page.tsx — api.get("/reports/inventory")

### ✓ Library (4/4)
- [x] returns/page.tsx — libraryService.borrowings.list() filtered
- [x] members/page.tsx — api.get("/library/members")
- [x] fines/page.tsx — api.get("/library/fines")
- [x] reports/page.tsx — api.get("/reports/library")

### ✓ Teacher (4/4)
- [x] results/page.tsx — academicService.examResults.list()
- [x] grades/page.tsx — academicService.examResults.list()
- [x] attendance/page.tsx — api.get("/attendance")
- [x] messages/page.tsx — api.get("/messages")

### ✓ Student (4/4)
- [x] attendance/page.tsx — api.get("/attendance")
- [x] results/page.tsx — academicService.examResults.list()
- [x] wallet/page.tsx — api.get("/wallet/transactions")
- [x] assignments/page.tsx — api.get("/assignments")

### ✓ Admin (6/7)
- [x] branches/page.tsx — branchService.list()
- [x] directors/page.tsx — staffService.list({ role: "director" })
- [x] directors/new/page.tsx — staffService.create()
- [x] school/page.tsx — api.get("/schools/me") + api.patch("/schools/me")
- [x] reports/page.tsx — api.get("/reports/admin")
- [x] settings/page.tsx — **static form, no backend endpoint needed**

### ✓ Finance (7/7)
- [x] journal/page.tsx — financeService.journalEntries.list()
- [x] wallets/page.tsx — api.get("/wallet/transactions")
- [x] payroll/page.tsx — api.get("/payroll")
- [x] reports/page.tsx — api.get("/reports/finance")
- [x] budgets/page.tsx — financeService.budgets.list()
- [x] expenses/page.tsx — financeService.expenses.list()
- [x] ledger/page.tsx — financeService.journal.list()

### ✓ Auditor (3/3)
- [x] logs/page.tsx — auditService.list()
- [x] security/page.tsx — auditService.list({ type: "security" })
- [x] reports/page.tsx — api.get("/reports/auditor")

### ✓ Cafeteria (3/3)
- [x] orders/page.tsx — cafeteriaService.orders.list()
- [x] wallet/page.tsx — api.get("/wallet/transactions")
- [x] reports/page.tsx — api.get("/reports/cafeteria")

### ✓ Parent (5/5)
- [x] attendance/page.tsx — api.get("/attendance")
- [x] messages/page.tsx — api.get("/messages")
- [x] payments/page.tsx — financeService.payments.list()
- [x] results/page.tsx — academicService.examResults.list()
- [x] wallet/page.tsx — api.get("/wallet/transactions")

### Already on API (no change needed)
- [x] login/page.tsx — uses useAuth()
- [x] activate pages — uses setupService
- [x] registrar/students/new — uses studentService.create()
- [x] registrar/qr — uses qrService

## Backend Endpoints Still Needed
| Endpoint | Purpose | Blocks |
|---|---|---|
| ~~`GET /support/tickets`~~ | Support tickets | ✅ **DONE** |
| ~~`GET /reports/{module}`~~ | Module reports | ✅ **DONE** |
| ~~`GET /recruitment`~~ | HR recruitment | ✅ **DONE** |
| ~~`GET /performance-reviews`~~ | HR performance reviews | ✅ **Already existed** |
| ~~`GET /inventory/assets`~~ | Fixed assets | ✅ **DONE** |
| ~~`GET /library/members`~~ | Library members | ✅ **DONE** |
| ~~`GET /library/fines`~~ | Library fines | ✅ **DONE** |
| ~~`GET /assignments`~~ | Student assignments | ✅ **DONE** |
| `GET /settings` | System configuration | admin/settings (minor)
