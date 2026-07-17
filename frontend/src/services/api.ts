/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios"
import type {
  ApiResponse, UserProfile,
  Student, Parent, Teacher, Staff,
  Class, Section, Subject, AcademicYear, Semester, Exam, ExamResult, TimetableEntry,
  Branch, DashboardOverview, DashboardTrends,
  Account, Invoice, Payment, FeeType, FeeStructure, Budget, JournalEntry,
  Contract, LeaveRequest, Attendance,
  InventoryCategory, InventoryItem, StockMovement, Supplier,
  Book, Borrowing,
  CafeteriaProduct, CafeteriaOrder,
  License, AuditLog,
  NfcAssignment, PrintRequest,
  NotificationPreferences,
  CorporateDepartment, CorporateEmployee,
} from "@/types/api"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match?.[1]
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken()
  if (csrfToken && !config.headers.get("X-CSRF-Token")) {
    config.headers.set("X-CSRF-Token", csrfToken)
  }
  return config
})

let refreshPromise: Promise<void> | null = null

api.interceptors.response.use((response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          ).then(() => {}).finally(() => { refreshPromise = null })
        }
        await refreshPromise
        return api(originalRequest)
      } catch {
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=session_expired"
        }
      }
    }
    if (error.response?.status === 429 && typeof window !== "undefined") {
      console.warn("Rate limited — too many requests")
    }
    return Promise.reject(error)
  }
)

export default api

export const recoveryService = {
  initiate: (data: { identifier: string; reason?: string }): ApiResponse<any> =>
    api.post("/auth/recovery/initiate", data),
  generateTempPassword: (data: { target_user_id: string; reason: string }): ApiResponse<any> =>
    api.post("/auth/recovery/admin/temp-password", data),
  generateRecoveryCodes: (): ApiResponse<any> =>
    api.post("/auth/recovery/codes/generate"),
  listRecoveryCodes: (): ApiResponse<any> =>
    api.get("/auth/recovery/codes"),
  verifyRecoveryCode: (data: { code: string; user_id: string }): ApiResponse<any> =>
    api.post("/auth/recovery/codes/verify", data),
  approve: (data: { request_id: string; approved: boolean; reason?: string }): ApiResponse<any> =>
    api.post("/auth/recovery/approve", data),
  apply: (data: { request_id: string; new_password: string; confirm_password: string }): ApiResponse<any> =>
    api.post("/auth/recovery/apply", data),
  generateEmergencyToken: (data: { target_user_id: string; ttl_seconds?: number }): ApiResponse<any> =>
    api.post("/auth/recovery/emergency/generate-token", data),
  emergencyApply: (data: { token: string; new_password: string; confirm_password: string }): ApiResponse<any> =>
    api.post("/auth/recovery/emergency/apply", data),
  auditLog: (params?: { target_user_id?: string; action?: string; limit?: number; offset?: number }): ApiResponse<any> =>
    api.get("/auth/recovery/audit", { params }),
}

export const authService = {
  login: (email: string, password: string, employee_id?: string): ApiResponse<{ access_token: string; user: UserProfile }> =>
    api.post("/auth/login", employee_id ? { employee_id, password } : { email, password }),
  register: (data: any): ApiResponse<UserProfile> => api.post("/auth/register", data),
  refresh: (refreshToken: string): ApiResponse<{ access_token: string }> => api.post("/auth/refresh", { refresh_token: refreshToken }),
  me: (): ApiResponse<UserProfile> => api.get("/auth/me"),
  logout: (): ApiResponse<void> => api.post("/auth/logout"),
  forgotPassword: (email: string): ApiResponse<void> => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string): ApiResponse<void> => api.post("/auth/reset-password", { token, password }),
}

export const studentService = {
  list: (params?: Record<string, unknown>): ApiResponse<Student[]> => api.get("/students", { params }),
  get: (id: string): ApiResponse<Student> => api.get(`/students/${id}`),
  create: (data: Partial<Student>): ApiResponse<Student> => api.post("/students", data),
  update: (id: string, data: Partial<Student>): ApiResponse<Student> => api.patch(`/students/${id}`, data),
  delete: (id: string): ApiResponse<void> => api.delete(`/students/${id}`),
  transfer: (id: string, data: { to_class_id: string }): ApiResponse<Student> => api.post(`/students/${id}/transfer`, data),
  promote: (id: string, data: { academic_year_id: string }): ApiResponse<Student> => api.post(`/students/${id}/promote`, data),
}

export const parentService = {
  search: (data: { query: string }): ApiResponse<Parent[]> => api.post("/parents/search", data),
  create: (data: Partial<Parent>): ApiResponse<Parent> => api.post("/parents", data),
  list: (params?: Record<string, unknown>): ApiResponse<Parent[]> => api.get("/parents", { params }),
  get: (id: string): ApiResponse<Parent> => api.get(`/parents/${id}`),
  update: (id: string, data: Partial<Parent>): ApiResponse<Parent> => api.patch(`/parents/${id}`, data),
  link: (id: string, data: { student_id: string; relationship: string }): ApiResponse<void> => api.post(`/parents/${id}/link`, data),
  unlink: (id: string, data: { student_id: string }): ApiResponse<void> => api.delete(`/parents/${id}/unlink`, { params: data }),
  dashboard: (): ApiResponse<Record<string, unknown>> => api.get("/parent-portal/dashboard"),
}

export const teacherService = {
  create: (data: Partial<Teacher>): ApiResponse<Teacher> => api.post("/teachers", data),
  list: (params?: Record<string, unknown>): ApiResponse<Teacher[]> => api.get("/teachers", { params }),
  update: (id: string, data: Partial<Teacher>): ApiResponse<Teacher> => api.patch(`/teachers/${id}`, data),
  assignGrade: (id: string, data: { grade_id: string }): ApiResponse<Teacher> => api.post(`/teachers/${id}/assign-grade`, data),
  assignSection: (id: string, data: { section_id: string }): ApiResponse<Teacher> => api.post(`/teachers/${id}/assign-section`, data),
  assignSubjects: (id: string, subjectIds: string[]): ApiResponse<Teacher> => api.post(`/teachers/${id}/assign-subjects`, subjectIds),
  getSubjects: (id: string): ApiResponse<Subject[]> => api.get(`/teachers/${id}/subjects`),
  getMySubjects: (): ApiResponse<Subject[]> => api.get("/teachers/me/subjects"),
  getMyProfile: (): ApiResponse<Teacher> => api.get("/teachers/me/profile"),
  updateMe: (data: Partial<Teacher>): ApiResponse<Teacher> => api.patch("/teachers/me", data),
  getMyStudents: (): ApiResponse<Student[]> => api.get("/teachers/me/students"),
}

export const staffService = {
  create: (data: Partial<Staff>): ApiResponse<Staff> => api.post("/staff", data),
  list: (params?: Record<string, unknown>): ApiResponse<Staff[]> => api.get("/staff", { params }),
}

export const academicService = {
  classes: {
    list: (params?: Record<string, unknown>): ApiResponse<Class[]> => api.get("/classes", { params }),
    create: (data: Partial<Class>): ApiResponse<Class> => api.post("/classes", data),
    update: (id: string, data: Partial<Class>): ApiResponse<Class> => api.patch(`/classes/${id}`, data),
    delete: (id: string): ApiResponse<void> => api.delete(`/classes/${id}`),
  },
  sections: {
    list: (params?: Record<string, unknown>): ApiResponse<Section[]> => api.get("/sections", { params }),
    create: (data: Partial<Section>): ApiResponse<Section> => api.post("/sections", data),
    update: (id: string, data: Partial<Section>): ApiResponse<Section> => api.patch(`/sections/${id}`, data),
    delete: (id: string): ApiResponse<void> => api.delete(`/sections/${id}`),
  },
  subjects: {
    list: (params?: Record<string, unknown>): ApiResponse<Subject[]> => api.get("/subjects", { params }),
    create: (data: Partial<Subject>): ApiResponse<Subject> => api.post("/subjects", data),
    update: (id: string, data: Partial<Subject>): ApiResponse<Subject> => api.patch(`/subjects/${id}`, data),
    delete: (id: string): ApiResponse<void> => api.delete(`/subjects/${id}`),
  },
  academicYears: {
    list: (): ApiResponse<AcademicYear[]> => api.get("/academic-years"),
    create: (data: Partial<AcademicYear>): ApiResponse<AcademicYear> => api.post("/academic-years", data),
    setCurrent: (id: string): ApiResponse<AcademicYear> => api.patch(`/academic-years/${id}/set-current`),
  },
  semesters: {
    list: (params?: Record<string, unknown>): ApiResponse<Semester[]> => api.get("/semesters", { params }),
    create: (data: Partial<Semester>): ApiResponse<Semester> => api.post("/semesters", data),
  },
  exams: {
    list: (params?: Record<string, unknown>): ApiResponse<Exam[]> => api.get("/exams", { params }),
    create: (data: Partial<Exam>): ApiResponse<Exam> => api.post("/exams", data),
  },
  examResults: {
    list: (params?: Record<string, unknown>): ApiResponse<ExamResult[]> => api.get("/exam-results", { params }),
    create: (data: Partial<ExamResult>): ApiResponse<ExamResult> => api.post("/exam-results", data),
    bulkCreate: (data: Partial<ExamResult>[]): ApiResponse<ExamResult[]> => api.post("/exam-results/bulk", data),
    marksheet: (subjectId: string, sectionId: string): ApiResponse<ExamResult[]> =>
      api.get("/exam-results/marksheet", { params: { subject_id: subjectId, section_id: sectionId } }),
  },
  timetable: {
    list: (params?: Record<string, unknown>): ApiResponse<TimetableEntry[]> => api.get("/timetable", { params }),
    create: (data: Partial<TimetableEntry>): ApiResponse<TimetableEntry> => api.post("/timetable", data),
    update: (id: string, data: Partial<TimetableEntry>): ApiResponse<TimetableEntry> => api.patch(`/timetable/${id}`, data),
    delete: (id: string): ApiResponse<void> => api.delete(`/timetable/${id}`),
    byTeacher: (): ApiResponse<TimetableEntry[]> => api.get("/timetable/by-teacher"),
    checkConflicts: (data: Partial<TimetableEntry>): ApiResponse<{ conflicts: string[] }> => api.post("/timetable/check-conflicts", data),
  },
}

export const financeService = {
  accounts: {
    list: (): ApiResponse<Account[]> => api.get("/accounts"),
    create: (data: Partial<Account>): ApiResponse<Account> => api.post("/accounts", data),
  },
  journalEntries: {
    list: (params?: Record<string, unknown>): ApiResponse<JournalEntry[]> => api.get("/journal-entries", { params }),
    create: (data: Partial<JournalEntry>): ApiResponse<JournalEntry> => api.post("/journal-entries", data),
    reverse: (id: string, reason: string): ApiResponse<JournalEntry> => api.post(`/journal-entries/${id}/reverse`, null, { params: { reason } }),
  },
  invoices: {
    list: (params?: Record<string, unknown>): ApiResponse<Invoice[]> => api.get("/invoices", { params }),
    create: (data: Partial<Invoice>): ApiResponse<Invoice> => api.post("/invoices", data),
  },
  payments: {
    list: (params?: Record<string, unknown>): ApiResponse<Payment[]> => api.get("/payments", { params }),
    create: (data: Partial<Payment>): ApiResponse<Payment> => api.post("/payments", data),
  },
  feeTypes: {
    list: (): ApiResponse<FeeType[]> => api.get("/fee-types"),
    create: (data: Partial<FeeType>): ApiResponse<FeeType> => api.post("/fee-types", data),
  },
  feeStructures: {
    list: (params?: Record<string, unknown>): ApiResponse<FeeStructure[]> => api.get("/fee-structures", { params }),
    create: (data: Partial<FeeStructure>): ApiResponse<FeeStructure> => api.post("/fee-structures", data),
  },
  feeAssignments: {
    list: (params?: Record<string, unknown>): ApiResponse<unknown[]> => api.get("/fee-assignments", { params }),
    create: (data: unknown): ApiResponse<unknown> => api.post("/fee-assignments", data),
  },
  budgets: {
    list: (params?: Record<string, unknown>): ApiResponse<Budget[]> => api.get("/budgets", { params }),
    create: (data: Partial<Budget>): ApiResponse<Budget> => api.post("/budgets", data),
  },
  journal: {
    list: (params?: Record<string, unknown>): ApiResponse<JournalEntry[]> => api.get("/journal-entries", { params }),
    create: (data: Partial<JournalEntry>): ApiResponse<JournalEntry> => api.post("/journal-entries", data),
  },
  trialBalance: (): ApiResponse<{ total_debit: number; total_credit: number; rows: unknown[] }> => api.get("/reports/trial-balance"),
  payroll: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/payroll", { params }),
  },
  reports: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/reports/finance", { params }),
  },
  walletTransactions: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/wallet/transactions", { params }),
  },
}

export const hrService = {
  contracts: {
    list: (params?: Record<string, unknown>): ApiResponse<Contract[]> => api.get("/contracts", { params }),
    create: (data: Partial<Contract>): ApiResponse<Contract> => api.post("/contracts", data),
  },
  leaveRequests: {
    list: (params?: Record<string, unknown>): ApiResponse<LeaveRequest[]> => api.get("/leave-requests", { params }),
    create: (data: Partial<LeaveRequest>): ApiResponse<LeaveRequest> => api.post("/leave-requests", data),
    approve: (id: string): ApiResponse<LeaveRequest> => api.post(`/leave-requests/${id}/approve`),
    reject: (id: string): ApiResponse<LeaveRequest> => api.post(`/leave-requests/${id}/reject`),
  },
  attendance: {
    list: (params?: Record<string, unknown>): ApiResponse<Attendance[]> => api.get("/attendance", { params }),
    mark: (data: Partial<Attendance>): ApiResponse<Attendance> => api.post("/attendance", data),
    bulk: (data: Partial<Attendance>[]): ApiResponse<Attendance[]> => api.post("/attendance/bulk", data),
  },
  scanAttendance: (data: { qr_uuid: string; date: string }): ApiResponse<Attendance> => api.post("/scanner/attendance", data),
  performanceReviews: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/performance-reviews", { params }),
  },
  recruitment: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/recruitment", { params }),
  },
  reports: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/reports/hr", { params }),
  },
}

export const inventoryService = {
  categories: {
    list: (): ApiResponse<InventoryCategory[]> => api.get("/inventory/categories"),
    create: (data: Partial<InventoryCategory>): ApiResponse<InventoryCategory> => api.post("/inventory/categories", data),
  },
  items: {
    list: (params?: Record<string, unknown>): ApiResponse<InventoryItem[]> => api.get("/inventory/items", { params }),
    create: (data: Partial<InventoryItem>): ApiResponse<InventoryItem> => api.post("/inventory/items", data),
    update: (id: string, data: Partial<InventoryItem>): ApiResponse<InventoryItem> => api.patch(`/inventory/items/${id}`, data),
  },
  stockMovements: {
    list: (params?: Record<string, unknown>): ApiResponse<StockMovement[]> => api.get("/inventory/stock-movements", { params }),
    create: (data: Partial<StockMovement>): ApiResponse<StockMovement> => api.post("/inventory/stock-movements", data),
  },
  suppliers: {
    list: (): ApiResponse<Supplier[]> => api.get("/inventory/suppliers"),
    create: (data: Partial<Supplier>): ApiResponse<Supplier> => api.post("/inventory/suppliers", data),
  },
  assets: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/inventory/assets", { params }),
  },
  reports: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/reports/inventory", { params }),
  },
}

export const qrService = {
  generate: (data: { entity_type: string; entity_id: string }): ApiResponse<{ uuid: string }> => api.post("/qr/generate", data),
  validate: (uuid: string): ApiResponse<{ entity_type: string; entity_id: string }> => api.get(`/qr/${uuid}`),
}

export const nfcService = {
  assign: (data: { card_uid: string; entity_type: string; entity_id: string }): ApiResponse<NfcAssignment> => api.post("/nfc/assign", data),
  validate: (data: { card_uid: string }): ApiResponse<{ valid: boolean }> => api.post("/nfc/validate", data),
}

export const nfcV2Service = {
  assignStudent: (data: { card_uid: string; student_id: string }): ApiResponse<NfcAssignment> => api.post("/nfc/student/assign", data),
  assignStaff: (data: { card_uid: string; staff_id: string }): ApiResponse<NfcAssignment> => api.post("/nfc/staff/assign", data),
  assignParent: (data: { card_uid: string; parent_id: string }): ApiResponse<NfcAssignment> => api.post("/nfc/parent/assign", data),
  assignEmployee: (data: { card_uid: string; employee_id: string }): ApiResponse<NfcAssignment> => api.post("/nfc/employee/assign", data),
  scan: (data: { card_uid: string }): ApiResponse<{ entity_type: string; entity_id: string }> => api.post("/nfc/scan", data),
  bulkAssign: (items: { card_uid: string; entity_type: string; entity_id: string }[]): ApiResponse<NfcAssignment[]> => api.post("/nfc/bulk-assign", items),
  publicLookup: (cardUid: string): ApiResponse<{ name: string; type: string }> => api.get(`/nfc/public/lookup`, { params: { card_uid: cardUid } }),
  downloadCardPdf: (cardType: string, referenceId: string): ApiResponse<Blob> =>
    api.get(`/nfc/print-card/${cardType}/${referenceId}`, { responseType: "blob" }),
  getStudentByCard: (cardUid: string): ApiResponse<Student> => api.get(`/nfc/student/by-card/${cardUid}`),
  getStaffByCard: (cardUid: string): ApiResponse<Staff> => api.get(`/nfc/staff/by-card/${cardUid}`),
  getParentByCard: (cardUid: string): ApiResponse<Parent> => api.get(`/nfc/parent/by-card/${cardUid}`),
  getEmployeeByCard: (cardUid: string): ApiResponse<CorporateEmployee> => api.get(`/nfc/employee/by-card/${cardUid}`),
  updateCardStatus: (cardType: string, cardId: string, status: string): ApiResponse<NfcAssignment> =>
    api.patch(`/nfc/card/${cardType}/${cardId}/status`, null, { params: { status } }),
  createPrintRequest: (data: { card_type: string; reference_id: string }): ApiResponse<PrintRequest> => api.post("/nfc/print-request", data),
  listPrintRequests: (statusFilter?: string): ApiResponse<PrintRequest[]> =>
    api.get("/nfc/print-requests", { params: statusFilter ? { status_filter: statusFilter } : {} }),
  processPrintRequest: (requestId: string, action: string = "approve"): ApiResponse<PrintRequest> =>
    api.patch(`/nfc/print-request/${requestId}/process`, null, { params: { action } }),
  listScanLogs: (): ApiResponse<{ timestamp: string; card_uid: string; status: string }[]> => api.get("/nfc/scan-logs"),
}

export const cardDesignService = {
  get: (schoolId: string): ApiResponse<{ design: Record<string, unknown> }> => api.get(`/card-design/${schoolId}`),
  save: (schoolId: string, data: { design: Record<string, unknown> }): ApiResponse<{ design: Record<string, unknown> }> => api.put(`/card-design/${schoolId}`, data),
}

export const corporateService = {
  departments: {
    list: (includeInactive?: boolean): ApiResponse<CorporateDepartment[]> =>
      api.get("/corporate/departments", { params: includeInactive ? { include_inactive: true } : {} }),
    create: (data: Partial<CorporateDepartment>): ApiResponse<CorporateDepartment> => api.post("/corporate/departments", data),
    update: (id: string, data: Partial<CorporateDepartment>): ApiResponse<CorporateDepartment> => api.patch(`/corporate/departments/${id}`, data),
  },
  employees: {
    list: (params?: Record<string, unknown>): ApiResponse<CorporateEmployee[]> => api.get("/corporate/employees", { params }),
    get: (id: string): ApiResponse<CorporateEmployee> => api.get(`/corporate/employees/${id}`),
    create: (data: Partial<CorporateEmployee>): ApiResponse<CorporateEmployee> => api.post("/corporate/employees", data),
    update: (id: string, data: Partial<CorporateEmployee>): ApiResponse<CorporateEmployee> => api.patch(`/corporate/employees/${id}`, data),
    delete: (id: string): ApiResponse<void> => api.delete(`/corporate/employees/${id}`),
  },
  dashboard: (): ApiResponse<Record<string, unknown>> => api.get("/corporate/dashboard"),
}

export const licenseService = {
  verify: (key: string): ApiResponse<{ valid: boolean; school_name?: string }> => api.post("/licenses/verify", { key }),
  activate: (key: string): ApiResponse<License> => api.post("/licenses/activate", { key }),
  list: (): ApiResponse<License[]> => api.get("/licenses"),
  get: (id: string): ApiResponse<License> => api.get(`/licenses/${id}`),
  create: (data: Partial<License>): ApiResponse<License> => api.post("/licenses", data),
  updateStatus: (id: string, status: string): ApiResponse<License> => api.patch(`/licenses/${id}/status`, { status }),
}

export const libraryService = {
  books: {
    list: (params?: Record<string, unknown>): ApiResponse<Book[]> => api.get("/library/books", { params }),
    create: (data: Partial<Book>): ApiResponse<Book> => api.post("/library/books", data),
  },
  categories: {
    list: (): ApiResponse<InventoryCategory[]> => api.get("/library/categories"),
    create: (data: Partial<InventoryCategory>): ApiResponse<InventoryCategory> => api.post("/library/categories", data),
  },
  borrowings: {
    list: (params?: Record<string, unknown>): ApiResponse<Borrowing[]> => api.get("/library/borrowings", { params }),
    borrow: (data: { book_id: string; member_id: string }): ApiResponse<Borrowing> => api.post("/library/borrowings", data),
    return: (id: string): ApiResponse<Borrowing> => api.post(`/library/borrowings/${id}/return`),
  },
}

export const cafeteriaService = {
  products: {
    list: (params?: Record<string, unknown>): ApiResponse<CafeteriaProduct[]> => api.get("/cafeteria/products", { params }),
    create: (data: Partial<CafeteriaProduct>): ApiResponse<CafeteriaProduct> => api.post("/cafeteria/products", data),
  },
  orders: {
    list: (params?: Record<string, unknown>): ApiResponse<CafeteriaOrder[]> => api.get("/cafeteria/orders", { params }),
    create: (data: Partial<CafeteriaOrder>): ApiResponse<CafeteriaOrder> => api.post("/cafeteria/orders", data),
  },
  reports: {
    list: (params?: Record<string, unknown>): ApiResponse<any[]> => api.get("/reports/cafeteria", { params }),
  },
}

export const deviceReviewService = {
  list: (status?: string): ApiResponse<{ id: string; status: string; requested_at: string }[]> =>
    api.get("/licenses/device-changes", { params: status ? { status_filter: status } : {} }),
  approve: (id: string, note?: string): ApiResponse<void> => api.post(`/licenses/device-changes/${id}/approve`, { note }),
  reject: (id: string, note?: string): ApiResponse<void> => api.post(`/licenses/device-changes/${id}/reject`, { note }),
  autoApprove: (): ApiResponse<{ approved: number }> => api.post("/licenses/device-changes/auto-approve"),
}

export const auditService = {
  list: (params?: Record<string, unknown>): ApiResponse<AuditLog[]> => api.get("/audit-logs", { params }),
}

export const setupWizardService = {
  status: (): ApiResponse<{ steps: Record<string, boolean>; all_done: boolean }> => api.get("/setup/wizard-status"),
}

export const setupService = {
  status: (): ApiResponse<{ setup_complete: boolean }> => api.get("/setup/status"),
  activateStatus: (): ApiResponse<{ activated: boolean }> => api.get("/activate/status"),
  validateLicense: (data: { key: string }): ApiResponse<{ valid: boolean }> => api.post("/activate/validate", data),
  activateInitialize: (data: Record<string, unknown>): ApiResponse<{ success: boolean }> => api.post("/activate/initialize", data),
  validateLicenseType: (key: string): ApiResponse<{ type: string }> => api.post("/activate/validate-type", { key }),
  initializeMain: (data: Record<string, unknown>): ApiResponse<{ success: boolean }> => api.post("/activate/initialize-main", data),
  initializeBranch: (data: Record<string, unknown>): ApiResponse<{ success: boolean }> => api.post("/activate/initialize-branch", data),
  createEmployee: (data: Record<string, unknown>): ApiResponse<Staff> => api.post("/employees/create", data),
  createSchool: (data: Record<string, unknown>): ApiResponse<{ id: string; name: string }> => api.post("/setup/school", data),
  createBranch: (data: Partial<Branch>): ApiResponse<Branch> => api.post("/setup/branch", data),
  createAdmin: (data: Record<string, unknown>): ApiResponse<UserProfile> => api.post("/setup/admin", data),
  verifySuperAdminContact: (phone: string, email: string): ApiResponse<{ verified: boolean }> =>
    api.post("/auth/verify-super-admin-contact", { phone, email }),
  resetPassword: (data: { employee_id: string; license_key: string; new_password: string }): ApiResponse<void> =>
    api.post("/activate/reset-password", data),
  installerStatus: (): ApiResponse<{ server_identity_exists: boolean; setup_complete: boolean }> => api.get("/installer/status"),
  installerWhoami: (): ApiResponse<{ role: string; email: string }> => api.get("/installer/whoami"),
  installerInitSuperAdmin: (data: { email: string; password: string }): ApiResponse<{ success: boolean }> => api.post("/installer/initialize-super-admin", data),
  installerInitMain: (data: { school_name: string; admin_email: string; admin_password: string }): ApiResponse<{ success: boolean }> => api.post("/installer/initialize-main", data),
  installerInitBranch: (data: { branch_name: string; branch_code: string; license_key: string }): ApiResponse<{ success: boolean }> => api.post("/installer/initialize-branch", data),
}

export const branchService = {
  list: (params?: Record<string, unknown>): ApiResponse<(Branch & { student_count?: number })[]> => api.get("/branches", { params }),
  create: (data: Partial<Branch>): ApiResponse<Branch> => api.post("/branches", data),
  get: (id: string): ApiResponse<Branch> => api.get(`/branches/${id}`),
  update: (id: string, data: Partial<Branch>): ApiResponse<Branch> => api.patch(`/branches/${id}`, data),
  delete: (id: string): ApiResponse<void> => api.delete(`/branches/${id}`),
}

export const schoolService = {
  list: (params?: Record<string, unknown>): ApiResponse<{ id: string; name: string; code: string }[]> => api.get("/schools", { params }),
  get: (id: string): ApiResponse<{ id: string; name: string; code: string }> => api.get(`/schools/${id}`),
}

export const telegramService = {
  status: (): ApiResponse<{ connected: boolean; bot_name?: string }> => api.get("/telegram/bot/status"),
  connect: (data: { bot_token: string }): ApiResponse<{ connected: boolean }> => api.post("/telegram/bot/connect", data),
  disconnect: (): ApiResponse<{ connected: boolean }> => api.post("/telegram/bot/disconnect"),
}

export const notificationService = {
  getPreferences: (): ApiResponse<NotificationPreferences> => api.get("/notifications/preferences"),
  updatePreferences: (data: Partial<NotificationPreferences>): ApiResponse<NotificationPreferences> => api.put("/notifications/preferences", data),
}

export const dashboardService = {
  overview: (): ApiResponse<DashboardOverview> => api.get("/dashboard/overview"),
  trends: (months?: number): ApiResponse<DashboardTrends> => api.get("/dashboard/trends", { params: { months } }),
}

export const studentPortalService = {
  dashboard: (): ApiResponse<Record<string, unknown>> => api.get("/student-portal/dashboard"),
}

export const platformService = {
  adminDashboard: (): ApiResponse<Record<string, unknown>> => api.get("/platform/admin/dashboard"),
  dailyReport: (date?: string): ApiResponse<Record<string, unknown>> => api.get("/platform/reports/daily", { params: { date_str: date } }),
  monthlyReport: (month?: number, year?: number): ApiResponse<Record<string, unknown>> => api.get("/platform/reports/monthly", { params: { month, year } }),
  schoolReport: (): ApiResponse<Record<string, unknown>[]> => api.get("/platform/reports/schools"),
}

export const announcementService = {
  list: (params?: Record<string, unknown>): ApiResponse<{ id: string; title: string; body: string; created_at: string }[]> =>
    api.get("/announcements", { params }),
  create: (data: { title: string; body: string }): ApiResponse<{ id: string; title: string; body: string }> => api.post("/announcements", data),
  delete: (id: string): ApiResponse<void> => api.delete(`/announcements/${id}`),
}
