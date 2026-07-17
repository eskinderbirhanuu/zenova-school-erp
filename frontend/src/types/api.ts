import type { AxiosResponse } from "axios"

// ─── Helpers ───────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
  pages: number
}

export type ApiResponse<T> = Promise<AxiosResponse<T>>
export type ApiPaginatedResponse<T> = Promise<AxiosResponse<PaginatedResponse<T>>>

// ─── Auth / User ───────────────────────────────────────
export interface UserProfile {
  id: string
  email: string
  role: string
  first_name: string
  last_name: string
  phone?: string
  is_active: boolean
  employee_id?: string
}

export interface LoginRequest {
  email?: string
  password: string
  employee_id?: string
}

// ─── Student ───────────────────────────────────────────
export interface Student {
  id: string
  student_id: string
  first_name: string
  middle_name?: string
  last_name: string
  gender: string
  date_of_birth?: string
  address?: string
  nationality?: string
  medical_notes?: string
  blood_group?: string
  emergency_contact?: string
  status: string
  grade_id?: string
  grade_name?: string
  section_id?: string
  section_name?: string
  academic_year_id?: string
  admission_date?: string
}

// ─── Parent ────────────────────────────────────────────
export interface Parent {
  id: string
  full_name: string
  relationship?: string
  phone_1?: string
  phone_2?: string
  occupation?: string
  address?: string
}

// ─── Teacher ───────────────────────────────────────────
export interface Teacher {
  id: string
  employee_id?: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  status?: string
  subjects?: Subject[]
}

// ─── Staff ─────────────────────────────────────────────
export interface Staff {
  id: string
  employee_id?: string
  first_name: string
  last_name: string
  role?: string
  department?: string
}

// ─── Academic ──────────────────────────────────────────
export interface Class {
  id: string
  name: string
  code?: string
  description?: string
}

export interface Section {
  id: string
  name: string
  class_id: string
  class_name?: string
}

export interface Subject {
  id: string
  name: string
  code?: string
}

export interface AcademicYear {
  id: string
  name: string
  start_date?: string
  end_date?: string
  is_current?: boolean
}

export interface Semester {
  id: string
  name: string
  academic_year_id: string
  start_date?: string
  end_date?: string
}

export interface Exam {
  id: string
  name: string
  subject_id: string
  exam_date?: string
  max_score?: number
}

export interface ExamResult {
  id: string
  student_id: string
  exam_id: string
  score: number
  grade?: string
}

export interface TimetableEntry {
  id: string
  class_id: string
  subject_id: string
  teacher_id: string
  day_of_week: number
  start_time: string
  end_time: string
  room?: string
}

// ─── Branch ────────────────────────────────────────────
export interface Branch {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  principal?: string
  status: string
  student_count?: number
  license_key?: string
}

// ─── Finance ───────────────────────────────────────────
export interface Account {
  id: string
  code: string
  name: string
  type: string
  balance?: number
}

export interface Invoice {
  id: string
  invoice_number: string
  student_id?: string
  amount: number
  status: string
  due_date?: string
  created_at?: string
}

export interface Payment {
  id: string
  invoice_id?: string
  amount: number
  payment_method?: string
  status: string
  payment_date?: string
}

export interface FeeType {
  id: string
  name: string
  amount: number
  frequency?: string
}

export interface FeeStructure {
  id: string
  name: string
  class_id: string
  amount: number
}

export interface Budget {
  id: string
  name: string
  amount: number
  spent: number
  fiscal_year?: string
}

export interface JournalEntry {
  id: string
  account_id: string
  amount: number
  type: "debit" | "credit"
  description?: string
  entry_date?: string
}

// ─── HR ────────────────────────────────────────────────
export interface Contract {
  id: string
  employee_id: string
  start_date: string
  end_date?: string
  type: string
  salary?: number
  status: string
}

export interface LeaveRequest {
  id: string
  employee_id: string
  leave_type: string
  start_date: string
  end_date: string
  status: string
  reason?: string
}

export interface Attendance {
  id: string
  entity_type: string
  entity_id: string
  date: string
  status: string
  check_in?: string
  check_out?: string
}

// ─── Inventory ─────────────────────────────────────────
export interface InventoryCategory {
  id: string
  name: string
  description?: string
}

export interface InventoryItem {
  id: string
  name: string
  sku?: string
  category_id?: string
  quantity: number
  unit_price?: number
  reorder_level?: number
}

export interface StockMovement {
  id: string
  item_id: string
  quantity: number
  movement_type: "in" | "out"
  reference?: string
  date: string
}

export interface Supplier {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
}

// ─── Library ───────────────────────────────────────────
export interface Book {
  id: string
  title: string
  author?: string
  isbn?: string
  category_id?: string
  quantity: number
  available: number
}

export interface Borrowing {
  id: string
  book_id: string
  book_title?: string
  member_id: string
  borrow_date: string
  due_date: string
  return_date?: string
  status: string
}

export interface LibraryMember {
  id: string
  name: string
  membership_type?: string
  phone?: string
}

// ─── Cafeteria ─────────────────────────────────────────
export interface CafeteriaProduct {
  id: string
  name: string
  price: number
  category?: string
  available: boolean
}

export interface CafeteriaOrder {
  id: string
  items: { product_id: string; quantity: number }[]
  total: number
  status: string
  created_at: string
}

// ─── Dashboard ─────────────────────────────────────────
export interface DashboardOverview {
  totals: {
    students: number
    staff: number
    teachers: number
    branches: number
  }
  finance: {
    revenue: number
    expenses?: number
  }
  academic_year?: {
    name: string
  }
  recent_activity?: DashboardActivity[]
}

export interface DashboardActivity {
  action: string
  table_name: string
  created_at: string
}

export interface DashboardTrends {
  enrollment_trend?: { month: string; students: number }[]
  revenue_trend?: { month: string; revenue: number; expenses: number }[]
}

// ─── License ───────────────────────────────────────────
export interface License {
  id: string
  key: string
  status: string
  school_name?: string
  expires_at?: string
  max_branches?: number
  max_students?: number
}

// ─── Audit ─────────────────────────────────────────────
export interface AuditLog {
  id: string
  action: string
  table_name?: string
  entity_id?: string
  user_id?: string
  details?: string
  created_at: string
}

// ─── NFC / QR ──────────────────────────────────────────
export interface NfcAssignment {
  id: string
  card_uid: string
  entity_type: string
  entity_id: string
  status: string
  assigned_at: string
}

export interface PrintRequest {
  id: string
  card_type: string
  reference_id: string
  status: string
  requested_at: string
}

// ─── Notification ──────────────────────────────────────
export interface NotificationPreferences {
  email: boolean
  sms: boolean
  push: boolean
  categories: Record<string, boolean>
}

// ─── Corporate ─────────────────────────────────────────
export interface CorporateDepartment {
  id: string
  name: string
  code?: string
  is_active: boolean
}

// ─── Password Recovery ─────────────────────────────────
export interface InitiateRecoveryRequest {
  identifier: string
  reason?: string
}

export interface InitiateRecoveryResponse {
  message: string
  request_id: string | null
  requires_approval: boolean
  alternative_method: string | null
  target_user_name?: string
}

export interface GenerateTempPasswordRequest {
  target_user_id: string
  reason: string
}

export interface GenerateTempPasswordResponse {
  temp_password: string
  expires_at: string
  must_change_on_login: boolean
}

export interface RecoveryCodeItem {
  id: string
  prefix: string
  is_used: boolean
  created_at: string
  expires_at: string | null
}

export interface VerifyRecoveryCodeRequest {
  code: string
  user_id: string
}

export interface ApplyRecoveryRequest {
  request_id: string
  new_password: string
  confirm_password: string
}

export interface GenerateEmergencyTokenResponse {
  token: string
  expires_at: string
  command: string
}

export interface EmergencyApplyRequest {
  token: string
  new_password: string
  confirm_password: string
}

export interface PasswordAuditEntry {
  id: string
  action: string
  target_user_id: string
  initiated_by_user_id: string | null
  approved_by_user_id: string | null
  ip_address: string | null
  reason: string | null
  created_at: string
}

export interface CorporateEmployee {
  id: string
  employee_id?: string
  first_name: string
  last_name: string
  department_id?: string
  card_uid?: string
  email?: string
  phone?: string
}
