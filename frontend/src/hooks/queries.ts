/* eslint-disable @typescript-eslint/no-explicit-any */
import { useApiQuery, useApiMutation } from "./use-api"
import type {
  Student, Parent, Teacher, Staff,
  Class, Section, Subject, AcademicYear, Semester, Exam, ExamResult, TimetableEntry,
  Branch, DashboardOverview, DashboardTrends,
  Account, Invoice, Payment, FeeType, FeeStructure, Budget, JournalEntry,
  Contract, LeaveRequest, Attendance,
  InventoryCategory, InventoryItem, StockMovement, Supplier,
  Book, Borrowing, CafeteriaProduct, CafeteriaOrder,
  License, AuditLog,
  PrintRequest,
  NotificationPreferences,
  CorporateDepartment, CorporateEmployee, UserProfile,
} from "@/types/api"
import api, {
  studentService, parentService, teacherService, staffService,
  academicService, branchService,
  financeService, hrService, inventoryService,
  qrService, nfcV2Service, cardDesignService,
  corporateService, licenseService, libraryService, cafeteriaService,
  deviceReviewService, auditService, notificationService, dashboardService,
  studentPortalService, platformService, announcementService, setupService, authService,
  setupWizardService, schoolService, telegramService,
} from "@/services/api"

// ─── Auth ───────────────────────────────────────────────

export function useMe() {
  return useApiQuery<UserProfile>(["auth", "me"], () => authService.me())
}

export function useLoginMutation() {
  return useApiMutation(
    ({ email, password, employee_id }: { email?: string; password: string; employee_id?: string }) =>
      authService.login(email ?? "", password, employee_id),
    { invalidate: [["auth", "me"]] },
  )
}

// ─── Students ───────────────────────────────────────────

export function useStudents(params?: Record<string, unknown>) {
  return useApiQuery<Student[]>(["students", params], () => studentService.list(params))
}

export function useStudent(id?: string) {
  return useApiQuery<Student>(["students", id], () => studentService.get(id!), { enabled: !!id })
}

export function useCreateStudent() {
  return useApiMutation((data: Partial<Student>) => studentService.create(data), { invalidate: [["students"]] })
}

export function useUpdateStudent() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Student> }) => studentService.update(id, data), { invalidate: [["students"]] })
}

export function useDeleteStudent() {
  return useApiMutation((id: string) => studentService.delete(id), { invalidate: [["students"]] })
}

export function useTransferStudent() {
  return useApiMutation(({ id, data }: { id: string; data: { to_class_id: string } }) => studentService.transfer(id, data), { invalidate: [["students"]] })
}

export function usePromoteStudent() {
  return useApiMutation(({ id, data }: { id: string; data: { academic_year_id: string } }) => studentService.promote(id, data), { invalidate: [["students"]] })
}

// ─── Parents ────────────────────────────────────────────

export function useParents(params?: Record<string, unknown>) {
  return useApiQuery<Parent[]>(["parents", params], () => parentService.list(params))
}

export function useParent(id?: string) {
  return useApiQuery<Parent>(["parents", id], () => parentService.get(id!), { enabled: !!id })
}

export function useCreateParent() {
  return useApiMutation((data: Partial<Parent>) => parentService.create(data), { invalidate: [["parents"]] })
}

export function useUpdateParent() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Parent> }) => parentService.update(id, data), { invalidate: [["parents"]] })
}

export function useSearchParents() {
  return useApiMutation((data: { query: string }) => parentService.search(data))
}

export function useLinkParent() {
  return useApiMutation(({ id, student_id, relationship }: { id: string; student_id: string; relationship: string }) => parentService.link(id, { student_id, relationship }), { invalidate: [["parents"]] })
}

export function useUnlinkParent() {
  return useApiMutation(({ id, student_id }: { id: string; student_id: string }) => parentService.unlink(id, { student_id }), { invalidate: [["parents"]] })
}

// ─── Teachers ───────────────────────────────────────────

export function useTeachers(params?: Record<string, unknown>) {
  return useApiQuery<Teacher[]>(["teachers", params], () => teacherService.list(params))
}

export function useCreateTeacher() {
  return useApiMutation((data: Partial<Teacher>) => teacherService.create(data), { invalidate: [["teachers"]] })
}

export function useUpdateTeacher() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Teacher> }) => teacherService.update(id, data), { invalidate: [["teachers"]] })
}

export function useTeacherSubjects(id?: string) {
  return useApiQuery<Subject[]>(["teachers", id, "subjects"], () => teacherService.getSubjects(id!), { enabled: !!id })
}

export function useMySubjects() {
  return useApiQuery<Subject[]>(["teachers", "me", "subjects"], () => teacherService.getMySubjects())
}

export function useMyProfile() {
  return useApiQuery<Teacher>(["teachers", "me"], () => teacherService.getMyProfile())
}

export function useMyStudents() {
  return useApiQuery<Student[]>(["teachers", "me", "students"], () => teacherService.getMyStudents())
}

// ─── Staff ──────────────────────────────────────────────

export function useStaff(params?: Record<string, unknown>) {
  return useApiQuery<Staff[]>(["staff", params], () => staffService.list(params))
}

export function useCreateStaff() {
  return useApiMutation((data: Partial<Staff>) => staffService.create(data), { invalidate: [["staff"]] })
}

// ─── Academic: Classes ──────────────────────────────────

export function useClasses(params?: Record<string, unknown>) {
  return useApiQuery<Class[]>(["classes", params], () => academicService.classes.list(params))
}

export function useCreateClass() {
  return useApiMutation((data: Partial<Class>) => academicService.classes.create(data), { invalidate: [["classes"]] })
}

export function useUpdateClass() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Class> }) => academicService.classes.update(id, data), { invalidate: [["classes"]] })
}

export function useDeleteClass() {
  return useApiMutation((id: string) => academicService.classes.delete(id), { invalidate: [["classes"]] })
}

// ─── Academic: Sections ─────────────────────────────────

export function useSections(params?: Record<string, unknown>) {
  return useApiQuery<Section[]>(["sections", params], () => academicService.sections.list(params))
}

export function useCreateSection() {
  return useApiMutation((data: Partial<Section>) => academicService.sections.create(data), { invalidate: [["sections"]] })
}

export function useUpdateSection() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Section> }) => academicService.sections.update(id, data), { invalidate: [["sections"]] })
}

export function useDeleteSection() {
  return useApiMutation((id: string) => academicService.sections.delete(id), { invalidate: [["sections"]] })
}

// ─── Academic: Subjects ─────────────────────────────────

export function useSubjects(params?: Record<string, unknown>) {
  return useApiQuery<Subject[]>(["subjects", params], () => academicService.subjects.list(params))
}

export function useCreateSubject() {
  return useApiMutation((data: Partial<Subject>) => academicService.subjects.create(data), { invalidate: [["subjects"]] })
}

export function useDeleteSubject() {
  return useApiMutation((id: string) => academicService.subjects.delete(id), { invalidate: [["subjects"]] })
}

// ─── Academic: Academic Years ───────────────────────────

export function useAcademicYears() {
  return useApiQuery<AcademicYear[]>(["academic-years"], () => academicService.academicYears.list())
}

export function useCreateAcademicYear() {
  return useApiMutation((data: Partial<AcademicYear>) => academicService.academicYears.create(data), { invalidate: [["academic-years"]] })
}

export function useSetCurrentAcademicYear() {
  return useApiMutation((id: string) => academicService.academicYears.setCurrent(id), { invalidate: [["academic-years"]] })
}

// ─── Academic: Semesters ────────────────────────────────

export function useSemesters(params?: Record<string, unknown>) {
  return useApiQuery<Semester[]>(["semesters", params], () => academicService.semesters.list(params))
}

export function useCreateSemester() {
  return useApiMutation((data: Partial<Semester>) => academicService.semesters.create(data), { invalidate: [["semesters"]] })
}

// ─── Academic: Exams ────────────────────────────────────

export function useExams(params?: Record<string, unknown>) {
  return useApiQuery<Exam[]>(["exams", params], () => academicService.exams.list(params))
}

export function useCreateExam() {
  return useApiMutation((data: Partial<Exam>) => academicService.exams.create(data), { invalidate: [["exams"]] })
}

// ─── Academic: Exam Results ─────────────────────────────

export function useExamResults(params?: Record<string, unknown>) {
  return useApiQuery<ExamResult[]>(["exam-results", params], () => academicService.examResults.list(params))
}

export function useCreateExamResult() {
  return useApiMutation((data: Partial<ExamResult>) => academicService.examResults.create(data), { invalidate: [["exam-results"]] })
}

export function useBulkCreateExamResults() {
  return useApiMutation((data: Partial<ExamResult>[]) => academicService.examResults.bulkCreate(data), { invalidate: [["exam-results"]] })
}

export function useMarksheet(subjectId?: string, sectionId?: string) {
  return useApiQuery<ExamResult[]>(["exam-results", "marksheet", subjectId, sectionId],
    () => academicService.examResults.marksheet(subjectId!, sectionId!),
    { enabled: !!subjectId && !!sectionId })
}

// ─── Academic: Timetable ────────────────────────────────

export function useTimetable(params?: Record<string, unknown>) {
  return useApiQuery<TimetableEntry[]>(["timetable", params], () => academicService.timetable.list(params))
}

export function useCreateTimetableEntry() {
  return useApiMutation((data: Partial<TimetableEntry>) => academicService.timetable.create(data), { invalidate: [["timetable"]] })
}

export function useUpdateTimetableEntry() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<TimetableEntry> }) => academicService.timetable.update(id, data), { invalidate: [["timetable"]] })
}

export function useDeleteTimetableEntry() {
  return useApiMutation((id: string) => academicService.timetable.delete(id), { invalidate: [["timetable"]] })
}

export function useMyTimetable() {
  return useApiQuery<TimetableEntry[]>(["timetable", "by-teacher"], () => academicService.timetable.byTeacher())
}

// ─── Branches ───────────────────────────────────────────

export function useBranches(params?: Record<string, unknown>) {
  return useApiQuery<(Branch & { student_count?: number })[]>(["branches", params], () => branchService.list(params))
}

export function useBranch(id?: string) {
  return useApiQuery<Branch>(["branches", id], () => branchService.get(id!), { enabled: !!id })
}

export function useCreateBranch() {
  return useApiMutation((data: Partial<Branch>) => branchService.create(data), { invalidate: [["branches"]] })
}

export function useUpdateBranch() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<Branch> }) => branchService.update(id, data), { invalidate: [["branches"]] })
}

export function useDeleteBranch() {
  return useApiMutation((id: string) => branchService.delete(id), { invalidate: [["branches"]] })
}

// ─── Finance: Accounts ──────────────────────────────────

export function useAccounts() {
  return useApiQuery<Account[]>(["accounts"], () => financeService.accounts.list())
}

export function useCreateAccount() {
  return useApiMutation((data: Partial<Account>) => financeService.accounts.create(data), { invalidate: [["accounts"]] })
}

// ─── Finance: Invoices ──────────────────────────────────

export function useInvoices(params?: Record<string, unknown>) {
  return useApiQuery<Invoice[]>(["invoices", params], () => financeService.invoices.list(params))
}

export function useCreateInvoice() {
  return useApiMutation((data: Partial<Invoice>) => financeService.invoices.create(data), { invalidate: [["invoices"]] })
}

// ─── Finance: Payments ──────────────────────────────────

export function usePayments(params?: Record<string, unknown>) {
  return useApiQuery<Payment[]>(["payments", params], () => financeService.payments.list(params))
}

export function useCreatePayment() {
  return useApiMutation((data: Partial<Payment>) => financeService.payments.create(data), { invalidate: [["payments", "invoices"]] })
}

// ─── Finance: Fee Types & Structures ────────────────────

export function useFeeTypes() {
  return useApiQuery<FeeType[]>(["fee-types"], () => financeService.feeTypes.list())
}

export function useCreateFeeType() {
  return useApiMutation((data: Partial<FeeType>) => financeService.feeTypes.create(data), { invalidate: [["fee-types"]] })
}

export function useFeeStructures(params?: Record<string, unknown>) {
  return useApiQuery<FeeStructure[]>(["fee-structures", params], () => financeService.feeStructures.list(params))
}

export function useCreateFeeStructure() {
  return useApiMutation((data: Partial<FeeStructure>) => financeService.feeStructures.create(data), { invalidate: [["fee-structures"]] })
}

// ─── Finance: Budgets ───────────────────────────────────

export function useBudgets(params?: Record<string, unknown>) {
  return useApiQuery<Budget[]>(["budgets", params], () => financeService.budgets.list(params))
}

export function useCreateBudget() {
  return useApiMutation((data: Partial<Budget>) => financeService.budgets.create(data), { invalidate: [["budgets"]] })
}

// ─── Finance: Journal Entries ───────────────────────────

export function useJournalEntries(params?: Record<string, unknown>) {
  return useApiQuery<JournalEntry[]>(["journal-entries", params], () => financeService.journalEntries.list(params))
}

export function useCreateJournalEntry() {
  return useApiMutation((data: Partial<JournalEntry>) => financeService.journalEntries.create(data), { invalidate: [["journal-entries"]] })
}

export function useReverseJournalEntry() {
  return useApiMutation(({ id, reason }: { id: string; reason: string }) => financeService.journalEntries.reverse(id, reason), { invalidate: [["journal-entries"]] })
}

// ─── Finance: Trial Balance ─────────────────────────────

export function useTrialBalance() {
  return useApiQuery<{ total_debit: number; total_credit: number; rows: unknown[] }>(["trial-balance"], () => financeService.trialBalance())
}

// ─── HR: Contracts ──────────────────────────────────────

export function useContracts(params?: Record<string, unknown>) {
  return useApiQuery<Contract[]>(["contracts", params], () => hrService.contracts.list(params))
}

export function useCreateContract() {
  return useApiMutation((data: Partial<Contract>) => hrService.contracts.create(data), { invalidate: [["contracts"]] })
}

// ─── HR: Leave Requests ─────────────────────────────────

export function useLeaveRequests(params?: Record<string, unknown>) {
  return useApiQuery<LeaveRequest[]>(["leave-requests", params], () => hrService.leaveRequests.list(params))
}

export function useCreateLeaveRequest() {
  return useApiMutation((data: Partial<LeaveRequest>) => hrService.leaveRequests.create(data), { invalidate: [["leave-requests"]] })
}

export function useApproveLeaveRequest() {
  return useApiMutation((id: string) => hrService.leaveRequests.approve(id), { invalidate: [["leave-requests"]] })
}

export function useRejectLeaveRequest() {
  return useApiMutation((id: string) => hrService.leaveRequests.reject(id), { invalidate: [["leave-requests"]] })
}

// ─── HR: Attendance ─────────────────────────────────────

export function useAttendance(params?: Record<string, unknown>) {
  return useApiQuery<Attendance[]>(["attendance", params], () => hrService.attendance.list(params))
}

export function useMarkAttendance() {
  return useApiMutation((data: Partial<Attendance>) => hrService.attendance.mark(data), { invalidate: [["attendance"]] })
}

export function useBulkAttendance() {
  return useApiMutation((data: Partial<Attendance>[]) => hrService.attendance.bulk(data), { invalidate: [["attendance"]] })
}

// ─── Inventory: Categories ──────────────────────────────

export function useInventoryCategories() {
  return useApiQuery<InventoryCategory[]>(["inventory", "categories"], () => inventoryService.categories.list())
}

export function useCreateInventoryCategory() {
  return useApiMutation((data: Partial<InventoryCategory>) => inventoryService.categories.create(data), { invalidate: [["inventory", "categories"]] })
}

// ─── Inventory: Items ───────────────────────────────────

export function useInventoryItems(params?: Record<string, unknown>) {
  return useApiQuery<InventoryItem[]>(["inventory", "items", params], () => inventoryService.items.list(params))
}

export function useCreateInventoryItem() {
  return useApiMutation((data: Partial<InventoryItem>) => inventoryService.items.create(data), { invalidate: [["inventory", "items"]] })
}

export function useUpdateInventoryItem() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<InventoryItem> }) => inventoryService.items.update(id, data), { invalidate: [["inventory", "items"]] })
}

// ─── Inventory: Stock Movements ─────────────────────────

export function useStockMovements(params?: Record<string, unknown>) {
  return useApiQuery<StockMovement[]>(["inventory", "stock-movements", params], () => inventoryService.stockMovements.list(params))
}

export function useCreateStockMovement() {
  return useApiMutation((data: Partial<StockMovement>) => inventoryService.stockMovements.create(data), { invalidate: [["inventory", "stock-movements", "inventory", "items"]] })
}

// ─── Inventory: Suppliers ───────────────────────────────

export function useSuppliers() {
  return useApiQuery<Supplier[]>(["inventory", "suppliers"], () => inventoryService.suppliers.list())
}

export function useCreateSupplier() {
  return useApiMutation((data: Partial<Supplier>) => inventoryService.suppliers.create(data), { invalidate: [["inventory", "suppliers"]] })
}

// ─── Library: Books ─────────────────────────────────────

export function useBooks(params?: Record<string, unknown>) {
  return useApiQuery<Book[]>(["library", "books", params], () => libraryService.books.list(params))
}

export function useCreateBook() {
  return useApiMutation((data: Partial<Book>) => libraryService.books.create(data), { invalidate: [["library", "books"]] })
}

// ─── Library: Borrowings ────────────────────────────────

export function useBorrowings(params?: Record<string, unknown>) {
  return useApiQuery<Borrowing[]>(["library", "borrowings", params], () => libraryService.borrowings.list(params))
}

export function useBorrowBook() {
  return useApiMutation((data: { book_id: string; member_id: string }) => libraryService.borrowings.borrow(data), { invalidate: [["library", "borrowings", "library", "books"]] })
}

export function useReturnBook() {
  return useApiMutation((id: string) => libraryService.borrowings.return(id), { invalidate: [["library", "borrowings", "library", "books"]] })
}

// ─── Cafeteria ──────────────────────────────────────────

export function useCafeteriaProducts(params?: Record<string, unknown>) {
  return useApiQuery<CafeteriaProduct[]>(["cafeteria", "products", params], () => cafeteriaService.products.list(params))
}

export function useCreateCafeteriaProduct() {
  return useApiMutation((data: Partial<CafeteriaProduct>) => cafeteriaService.products.create(data), { invalidate: [["cafeteria", "products"]] })
}

export function useCafeteriaOrders(params?: Record<string, unknown>) {
  return useApiQuery<CafeteriaOrder[]>(["cafeteria", "orders", params], () => cafeteriaService.orders.list(params))
}

export function useCreateCafeteriaOrder() {
  return useApiMutation((data: Partial<CafeteriaOrder>) => cafeteriaService.orders.create(data), { invalidate: [["cafeteria", "orders"]] })
}

// ─── Dashboard ──────────────────────────────────────────

export function useDashboardOverview() {
  return useApiQuery<DashboardOverview>(["dashboard", "overview"], () => dashboardService.overview())
}

export function useDashboardTrends(months?: number) {
  return useApiQuery<DashboardTrends>(["dashboard", "trends", months], () => dashboardService.trends(months))
}

// ─── Licenses ───────────────────────────────────────────

export function useLicenses() {
  return useApiQuery<License[]>(["licenses"], () => licenseService.list())
}

export function useLicense(id?: string) {
  return useApiQuery<License>(["licenses", id], () => licenseService.get(id!), { enabled: !!id })
}

export function useCreateLicense() {
  return useApiMutation((data: Partial<License>) => licenseService.create(data), { invalidate: [["licenses"]] })
}

export function useUpdateLicenseStatus() {
  return useApiMutation(({ id, status }: { id: string; status: string }) => licenseService.updateStatus(id, status), { invalidate: [["licenses"]] })
}

// ─── QR / NFC ───────────────────────────────────────────

export function useGenerateQr() {
  return useApiMutation((data: { entity_type: string; entity_id: string }) => qrService.generate(data))
}

export function useNfcAssignStudent() {
  return useApiMutation((data: { card_uid: string; student_id: string }) => nfcV2Service.assignStudent(data), { invalidate: [["students"]] })
}

export function useNfcAssignStaff() {
  return useApiMutation((data: { card_uid: string; staff_id: string }) => nfcV2Service.assignStaff(data), { invalidate: [["staff"]] })
}

export function useNfcAssignParent() {
  return useApiMutation((data: { card_uid: string; parent_id: string }) => nfcV2Service.assignParent(data), { invalidate: [["parents"]] })
}

export function useNfcPrintRequests(statusFilter?: string) {
  return useApiQuery<PrintRequest[]>(["nfc", "print-requests", statusFilter], () => nfcV2Service.listPrintRequests(statusFilter))
}

export function useNfcProcessPrintRequest() {
  return useApiMutation(({ requestId, action }: { requestId: string; action: string }) => nfcV2Service.processPrintRequest(requestId, action), { invalidate: [["nfc", "print-requests"]] })
}

// ─── Corporate ──────────────────────────────────────────

export function useCorporateDepartments(includeInactive?: boolean) {
  return useApiQuery<CorporateDepartment[]>(["corporate", "departments", includeInactive], () => corporateService.departments.list(includeInactive))
}

export function useCreateCorporateDepartment() {
  return useApiMutation((data: Partial<CorporateDepartment>) => corporateService.departments.create(data), { invalidate: [["corporate", "departments"]] })
}

export function useCorporateEmployees(params?: Record<string, unknown>) {
  return useApiQuery<CorporateEmployee[]>(["corporate", "employees", params], () => corporateService.employees.list(params))
}

export function useCorporateEmployee(id?: string) {
  return useApiQuery<CorporateEmployee>(["corporate", "employees", id], () => corporateService.employees.get(id!), { enabled: !!id })
}

export function useCreateCorporateEmployee() {
  return useApiMutation((data: Partial<CorporateEmployee>) => corporateService.employees.create(data), { invalidate: [["corporate", "employees"]] })
}

export function useUpdateCorporateEmployee() {
  return useApiMutation(({ id, data }: { id: string; data: Partial<CorporateEmployee> }) => corporateService.employees.update(id, data), { invalidate: [["corporate", "employees"]] })
}

export function useDeleteCorporateEmployee() {
  return useApiMutation((id: string) => corporateService.employees.delete(id), { invalidate: [["corporate", "employees"]] })
}

// ─── Audit ──────────────────────────────────────────────

export function useAuditLogs(params?: Record<string, unknown>) {
  return useApiQuery<AuditLog[]>(["audit-logs", params], () => auditService.list(params))
}

// ─── Notifications ──────────────────────────────────────

export function useNotificationPreferences() {
  return useApiQuery<NotificationPreferences>(["notification-preferences"], () => notificationService.getPreferences())
}

export function useUpdateNotificationPreferences() {
  return useApiMutation((data: Partial<NotificationPreferences>) => notificationService.updatePreferences(data), { invalidate: [["notification-preferences"]] })
}

// ─── Announcements ──────────────────────────────────────

export function useAnnouncements(params?: Record<string, unknown>) {
  return useApiQuery<{ id: string; title: string; body: string; created_at: string }[]>(["announcements", params], () => announcementService.list(params))
}

export function useCreateAnnouncement() {
  return useApiMutation((data: { title: string; body: string }) => announcementService.create(data), { invalidate: [["announcements"]] })
}

export function useDeleteAnnouncement() {
  return useApiMutation((id: string) => announcementService.delete(id), { invalidate: [["announcements"]] })
}

// ─── Student Portal ─────────────────────────────────────

export function useStudentPortalDashboard() {
  return useApiQuery<Record<string, unknown>>(["student-portal", "dashboard"], () => studentPortalService.dashboard())
}

// ─── Platform ───────────────────────────────────────────

export function usePlatformAdminDashboard() {
  return useApiQuery<Record<string, unknown>>(["platform", "admin", "dashboard"], () => platformService.adminDashboard())
}

// ─── Device Reviews ─────────────────────────────────────

export function useDeviceReviews(status?: string) {
  return useApiQuery<{ id: string; status: string; requested_at: string }[]>(["device-reviews", status], () => deviceReviewService.list(status))
}

export function useApproveDeviceReview() {
  return useApiMutation(({ id, note }: { id: string; note?: string }) => deviceReviewService.approve(id, note), { invalidate: [["device-reviews"]] })
}

export function useRejectDeviceReview() {
  return useApiMutation(({ id, note }: { id: string; note?: string }) => deviceReviewService.reject(id, note), { invalidate: [["device-reviews"]] })
}

// ─── Card Design ────────────────────────────────────────

export function useCardDesign(schoolId?: string) {
  return useApiQuery<{ design: Record<string, unknown> }>(["card-design", schoolId], () => cardDesignService.get(schoolId!), { enabled: !!schoolId })
}

export function useSaveCardDesign() {
  return useApiMutation(({ schoolId, data }: { schoolId: string; data: { design: Record<string, unknown> } }) => cardDesignService.save(schoolId, data), { invalidate: [["card-design"]] })
}

// ─── Setup ──────────────────────────────────────────────

export function useSetupStatus() {
  return useApiQuery<{ setup_complete: boolean }>(["setup", "status"], () => setupService.status())
}

export function useSetupWizardStatus() {
  return useApiQuery<{ steps: Record<string, boolean>; all_done: boolean }>(["setup", "wizard-status"], () => setupWizardService.status())
}

// ─── Missing hooks for remaining migrations ──────────────

export function useActivateStatus() {
  return useApiQuery<{ activated: boolean }>(["activate", "status"], () => setupService.activateStatus())
}

export function useValidateLicense(data: { key: string }, enabled?: boolean) {
  return useApiQuery<{ valid: boolean }>(["license", "validate", data], () => setupService.validateLicense(data), { enabled })
}

export function useInstallerStatus() {
  return useApiQuery<{ server_identity_exists: boolean; setup_complete: boolean }>(["installer", "status"], () => setupService.installerStatus())
}

export function useInstallerWhoami() {
  return useApiQuery<{ role: string; email: string }>(["installer", "whoami"], () => setupService.installerWhoami())
}

export function useParentDashboard() {
  return useApiQuery<Record<string, unknown>>(["parent", "dashboard"], () => parentService.dashboard())
}

export function useCorporateDashboard() {
  return useApiQuery<Record<string, unknown>>(["corporate", "dashboard"], () => corporateService.dashboard())
}

export function usePlatformSchoolReport() {
  return useApiQuery<Record<string, unknown>[]>(["platform", "school-report"], () => platformService.schoolReport())
}

export function useNfcScanLogs() {
  return useApiQuery<{ timestamp: string; card_uid: string; status: string }[]>(["nfc", "scan-logs"], () => nfcV2Service.listScanLogs())
}

export function useSchoolList(params?: Record<string, unknown>) {
  return useApiQuery<{ id: string; name: string; code: string }[]>(["schools", params], () => schoolService.list(params))
}

export function useSchool(id?: string) {
  return useApiQuery<{ id: string; name: string; code: string }>(["schools", id], () => schoolService.get(id!), { enabled: !!id })
}

export function useTelegramStatus() {
  return useApiQuery<{ connected: boolean; bot_name?: string }>(["telegram", "status"], () => telegramService.status())
}

export function useNfcScan() {
  return useApiMutation((data: { card_uid: string }) => nfcV2Service.scan(data))
}

export function useNfcBulkAssign() {
  return useApiMutation((items: { card_uid: string; entity_type: string; entity_id: string }[]) => nfcV2Service.bulkAssign(items))
}

export function useNfcCreatePrintRequest() {
  return useApiMutation((data: { card_type: string; reference_id: string; notes?: string }) => nfcV2Service.createPrintRequest(data), { invalidate: [["nfc", "print-requests"]] })
}

// ─── Payroll ────────────────────────────────────────────

export function usePayroll(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["payroll", params], () => financeService.payroll.list(params))
}

export function useFinanceReports(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["finance", "reports", params], () => financeService.reports.list(params))
}

export function useWalletTransactions(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["wallet", "transactions", params], () => financeService.walletTransactions.list(params))
}

export function usePerformanceReviews(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["performance-reviews", params], () => hrService.performanceReviews.list(params))
}

export function useRecruitment(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["recruitment", params], () => hrService.recruitment.list(params))
}

export function useHrReports(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["hr", "reports", params], () => hrService.reports.list(params))
}

export function useInventoryAssets(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["inventory", "assets", params], () => inventoryService.assets.list(params))
}

export function useInventoryReports(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["inventory", "reports", params], () => inventoryService.reports.list(params))
}

export function useCafeteriaReports(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["cafeteria", "reports", params], () => cafeteriaService.reports.list(params))
}

export function useUsers(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["users", params], () => api.get("/users", { params }))
}

export function useIgaMetrics() {
  return useApiQuery<any>(["iga", "metrics"], () => api.get("/iga/metrics"))
}

export function useIgaHealthSummary() {
  return useApiQuery<any>(["iga", "health-summary"], () => api.get("/iga/health-summary"))
}

export function useSystemReports() {
  return useApiQuery<any[]>(["reports", "system"], () => api.get("/reports/system"))
}

export function useAdminReports() {
  return useApiQuery<any[]>(["reports", "admin"], () => api.get("/reports/admin"))
}

export function useSupportTickets() {
  return useApiQuery<any[]>(["support", "tickets"], () => api.get("/support/tickets", { params: { limit: 200 } }))
}

export function useSupportTicketCounts() {
  return useApiQuery<any>(["support", "tickets", "counts"], () => api.get("/support/tickets/counts"))
}

export function useSettings() {
  return useApiQuery<any>(["settings"], () => api.get("/settings"))
}

export function useMySchool() {
  return useApiQuery<any>(["schools", "me"], () => api.get("/schools/me"))
}

export function useReportCards() {
  return useApiQuery<any[]>(["report-cards"], () => api.get("/report-cards"))
}

export function useReportCard(id?: string) {
  return useApiQuery<any>(["report-cards", id], () => api.get(`/report-cards/${id}`), { enabled: !!id })
}

export function useLibraryCategories() {
  return useApiQuery<InventoryCategory[]>(["library", "categories"], () => libraryService.categories.list())
}

export function useLibraryFines(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["library", "fines", params], () => api.get("/library/fines", { params }))
}

export function useLibraryMembers(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["library", "members", params], () => api.get("/library/members", { params }))
}

export function useLibraryReports() {
  return useApiQuery<any[]>(["library", "reports"], () => api.get("/reports/library"))
}

export function useCalendarEvents(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["calendar", "events", params], () => api.get("/events", { params }))
}

export function useProcurementItems(endpoint: string) {
  return useApiQuery<any[]>(["procurement", endpoint], () => api.get(endpoint, { params: { limit: 50 } }), { enabled: !!endpoint })
}

export function useStudentAssignments(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["student", "assignments", params], () => api.get("/assignments", { params }))
}

export function useMessages(params?: Record<string, unknown>) {
  return useApiQuery<any[]>(["messages", params], () => api.get("/messages", { params }))
}

export function useParentPaymentsDashboard() {
  return useApiQuery<any>(["parent-payments", "dashboard"], () => api.get("/parent-payments/dashboard"))
}

export function usePaymentSession(sessionId?: string) {
  return useApiQuery<any>(["parent-payments", "session", sessionId], () => api.get(`/parent-payments/session/${sessionId}`), { enabled: !!sessionId })
}

export function useReceipts() {
  return useApiQuery<any[]>(["parent-payments", "receipts"], () => api.get("/parent-payments/receipts"))
}

export function useStudentTranscript(studentId?: string) {
  return useApiQuery<any>(["students", "transcript", studentId], () => api.get(`/students/${studentId}/transcript`), { enabled: !!studentId })
}

export function usePlatformDashboard() {
  return useApiQuery<any>(["platform", "dashboard"], () => api.get("/platform/dashboard"))
}


