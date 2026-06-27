import axios from "axios"

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
})

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

api.interceptors.request.use((config) => {
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        )
        return api(originalRequest)
      } catch {
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=session_expired"
        }
      }
    }
    if (error.response?.status === 429) {
      console.error("Rate limited — too many requests")
    }
    return Promise.reject(error)
  }
)

export default api

export const authService = {
  login: (email: string, password: string, employee_id?: string) =>
    api.post("/auth/login", employee_id ? { employee_id, password } : { email, password }),
  register: (data: any) => api.post("/auth/register", data),
  refresh: (refreshToken: string) => api.post("/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => api.post("/auth/reset-password", { token, password }),
}

export const studentService = {
  list: (params?: any) => api.get("/students", { params }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: any) => api.post("/students", data),
  update: (id: string, data: any) => api.patch(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
  transfer: (id: string, data: any) => api.post(`/students/${id}/transfer`, data),
  promote: (id: string, data: any) => api.post(`/students/${id}/promote`, data),
}

export const parentService = {
  search: (data: any) => api.post("/parents/search", data),
  create: (data: any) => api.post("/parents", data),
  list: (params?: any) => api.get("/parents", { params }),
  get: (id: string) => api.get(`/parents/${id}`),
  update: (id: string, data: any) => api.patch(`/parents/${id}`, data),
  link: (id: string, data: any) => api.post(`/parents/${id}/link`, data),
  unlink: (id: string, data: any) => api.delete(`/parents/${id}/unlink`, { data }),
}

export const teacherService = {
  create: (data: any) => api.post("/teachers", data),
  list: (params?: any) => api.get("/teachers", { params }),
  assignGrade: (id: string, data: any) => api.post(`/teachers/${id}/assign-grade`, data),
  assignSection: (id: string, data: any) => api.post(`/teachers/${id}/assign-section`, data),
  assignSubjects: (id: string, subjectIds: string[]) => api.post(`/teachers/${id}/assign-subjects`, subjectIds),
  getSubjects: (id: string) => api.get(`/teachers/${id}/subjects`),
}

export const staffService = {
  create: (data: any) => api.post("/staff", data),
  list: (params?: any) => api.get("/staff", { params }),
}

export const academicService = {
  classes: {
    list: (params?: any) => api.get("/classes", { params }),
    create: (data: any) => api.post("/classes", data),
  },
  sections: {
    list: (params?: any) => api.get("/sections", { params }),
    create: (data: any) => api.post("/sections", data),
  },
  subjects: {
    list: (params?: any) => api.get("/subjects", { params }),
    create: (data: any) => api.post("/subjects", data),
  },
  academicYears: {
    list: () => api.get("/academic-years"),
    create: (data: any) => api.post("/academic-years", data),
    setCurrent: (id: string) => api.patch(`/academic-years/${id}/set-current`),
  },
  exams: {
    list: (params?: any) => api.get("/exams", { params }),
    create: (data: any) => api.post("/exams", data),
  },
  examResults: {
    list: (params?: any) => api.get("/exam-results", { params }),
    create: (data: any) => api.post("/exam-results", data),
  },
  timetable: {
    list: (params?: any) => api.get("/timetable", { params }),
    create: (data: any) => api.post("/timetable", data),
  },
}

export const financeService = {
  accounts: {
    list: () => api.get("/accounts"),
    create: (data: any) => api.post("/accounts", data),
  },
  journalEntries: {
    list: (params?: any) => api.get("/journal-entries", { params }),
    create: (data: any) => api.post("/journal-entries", data),
    reverse: (id: string, reason: string) => api.post(`/journal-entries/${id}/reverse`, null, { params: { reason } }),
  },
  invoices: {
    list: (params?: any) => api.get("/invoices", { params }),
    create: (data: any) => api.post("/invoices", data),
  },
  payments: {
    list: (params?: any) => api.get("/payments", { params }),
    create: (data: any) => api.post("/payments", data),
  },
  feeTypes: {
    list: () => api.get("/fee-types"),
    create: (data: any) => api.post("/fee-types", data),
  },
  feeStructures: {
    list: (params?: any) => api.get("/fee-structures", { params }),
    create: (data: any) => api.post("/fee-structures", data),
  },
  feeAssignments: {
    list: (params?: any) => api.get("/fee-assignments", { params }),
    create: (data: any) => api.post("/fee-assignments", data),
  },
  budgets: {
    list: (params?: any) => api.get("/finance/budgets", { params }),
    create: (data: any) => api.post("/finance/budgets", data),
  },
  expenses: {
    list: (params?: any) => api.get("/finance/expenses", { params }),
    create: (data: any) => api.post("/finance/expenses", data),
  },
  journal: {
    list: (params?: any) => api.get("/finance/journal", { params }),
    create: (data: any) => api.post("/finance/journal", data),
  },
  trialBalance: () => api.get("/reports/trial-balance"),
}

export const hrService = {
  contracts: {
    list: (params?: any) => api.get("/contracts", { params }),
    create: (data: any) => api.post("/contracts", data),
  },
  leaveRequests: {
    list: (params?: any) => api.get("/leave-requests", { params }),
    create: (data: any) => api.post("/leave-requests", data),
    approve: (id: string) => api.post(`/leave-requests/${id}/approve`),
    reject: (id: string) => api.post(`/leave-requests/${id}/reject`),
  },
  attendance: {
    list: (params?: any) => api.get("/attendance", { params }),
    mark: (data: any) => api.post("/attendance", data),
    bulk: (data: any[]) => api.post("/attendance/bulk", data),
  },
}

export const inventoryService = {
  categories: {
    list: () => api.get("/inventory/categories"),
    create: (data: any) => api.post("/inventory/categories", data),
  },
  items: {
    list: (params?: any) => api.get("/inventory/items", { params }),
    create: (data: any) => api.post("/inventory/items", data),
    update: (id: string, data: any) => api.patch(`/inventory/items/${id}`, data),
  },
  stockMovements: {
    list: (params?: any) => api.get("/inventory/stock-movements", { params }),
    create: (data: any) => api.post("/inventory/stock-movements", data),
  },
  suppliers: {
    list: () => api.get("/inventory/suppliers"),
    create: (data: any) => api.post("/inventory/suppliers", data),
  },
}

export const qrService = {
  generate: (data: any) => api.post("/qr/generate", data),
  validate: (uuid: string) => api.get(`/qr/${uuid}`),
}

export const nfcService = {
  assign: (data: any) => api.post("/nfc/assign", data),
  validate: (data: any) => api.post("/nfc/validate", data),
}

export const licenseService = {
  verify: (key: string) => api.post("/licenses/verify", { key }),
  activate: (key: string) => api.post("/licenses/activate", { key }),
  list: () => api.get("/licenses"),
  get: (id: string) => api.get(`/licenses/${id}`),
  create: (data: any) => api.post("/licenses", data),
  updateStatus: (id: string, status: string) => api.patch(`/licenses/${id}/status`, { status }),
}

export const libraryService = {
  books: {
    list: (params?: any) => api.get("/library/books", { params }),
    create: (data: any) => api.post("/library/books", data),
  },
  categories: {
    list: () => api.get("/library/categories"),
    create: (data: any) => api.post("/library/categories", data),
  },
  borrowings: {
    list: (params?: any) => api.get("/library/borrowings", { params }),
    borrow: (data: any) => api.post("/library/borrow", data),
    return: (id: string) => api.post(`/library/borrowings/${id}/return`),
  },
}

export const cafeteriaService = {
  products: {
    list: (params?: any) => api.get("/cafeteria/products", { params }),
    create: (data: any) => api.post("/cafeteria/products", data),
  },
  orders: {
    list: (params?: any) => api.get("/cafeteria/orders", { params }),
    create: (data: any) => api.post("/cafeteria/orders", data),
  },
  sales: {
    list: (params?: any) => api.get("/cafeteria/sales", { params }),
    create: (data: any) => api.post("/cafeteria/sales", data),
  },
}

export const auditService = {
  list: (params?: any) => api.get("/audit-logs", { params }),
}

export const setupService = {
  status: () => api.get("/setup/status"),
  activateStatus: () => api.get("/activate/status"),
  validateLicense: (data: any) => api.post("/activate/validate", data),
  activateInitialize: (data: any) => api.post("/activate/initialize", data),
  validateLicenseType: (key: string) => api.post("/activate/validate-type", { key }),
  initializeMain: (data: any) => api.post("/activate/initialize-main", data),
  initializeBranch: (data: any) => api.post("/activate/initialize-branch", data),
  createEmployee: (data: any) => api.post("/employees/create", data),
  createSchool: (data: any) => api.post("/setup/school", data),
  createBranch: (data: any) => api.post("/setup/branch", data),
  createAdmin: (data: any) => api.post("/setup/admin", data),
  verifySuperAdminContact: (phone: string, email: string) =>
    api.post("/auth/verify-super-admin-contact", { phone, email }),
  resetPassword: (data: { employee_id: string; license_key: string; new_password: string }) =>
    api.post("/activate/reset-password", data),
}

export const branchService = {
  list: (params?: any) => api.get("/branches", { params }),
  create: (data: any) => api.post("/branches", data),
  get: (id: string) => api.get(`/branches/${id}`),
  update: (id: string, data: any) => api.patch(`/branches/${id}`, data),
  delete: (id: string) => api.delete(`/branches/${id}`),
}

export const schoolService = {
  list: (params?: any) => api.get("/schools", { params }),
  get: (id: string) => api.get(`/schools/${id}`),
}

export const telegramService = {
  status: () => api.get("/telegram/bot/status"),
  connect: (data: { bot_token: string }) => api.post("/telegram/bot/connect", data),
  disconnect: () => api.post("/telegram/bot/disconnect"),
}

export const notificationService = {
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: any) => api.put("/notifications/preferences", data),
}
