import { apiGet, apiPost } from "./api"

export interface ParentGrade {
  subject: string
  exam: string
  score: number
  grade?: string | null
  max_score: number
}

export interface ParentFee {
  label: string
  amount: string
  paid: string
  due?: string | null
  status: string
}

export interface ParentChild {
  id: string
  full_name: string
  student_id: string
  class_name: string
  class_code: string
  relationship: string
  attendance_pct: number
  photo_url?: string | null
  grades: ParentGrade[]
  fees: ParentFee[]
}

export interface ParentDashboard {
  parent: { id: string; full_name: string; phone?: string | null }
  children: ParentChild[]
}

export interface ParentInvoice {
  id: string
  invoice_number: string
  student_id: string
  student_name: string
  total_amount: number
  paid_amount: number
  balance: number
  status: string
  due_date?: string | null
  issue_date?: string | null
  lines: { description: string; amount: number }[]
}

export interface ParentPaymentChild {
  id: string
  name: string
  student_id: string
  total_fees: number
  paid_amount: number
  outstanding_balance: number
}

export interface PaymentHistoryItem {
  id: string
  amount: number
  method: string
  date?: string | null
  status: string
  receipt_id?: string | null
  receipt_number?: string | null
}

export interface ParentPaymentDashboard {
  parent_id: string
  total_outstanding: number
  total_paid: number
  children: ParentPaymentChild[]
  payment_history: PaymentHistoryItem[]
  recent_invoices: ParentInvoice[]
}

export interface Receipt {
  id: string
  receipt_number: string
  amount_paid: number
  payment_method: string
  payment_date: string
  status: string
  transaction_id?: string | null
}

export function fetchParentDashboard(baseUrl: string): Promise<ParentDashboard> {
  return apiGet<ParentDashboard>(baseUrl, "/parent-portal/dashboard")
}

export function fetchParentPaymentDashboard(baseUrl: string): Promise<ParentPaymentDashboard> {
  return apiGet<ParentPaymentDashboard>(baseUrl, "/parent-payments/dashboard")
}

export function fetchParentInvoices(baseUrl: string): Promise<ParentInvoice[]> {
  return apiGet<ParentInvoice[]>(baseUrl, "/parent-payments/invoices")
}

export function fetchReceipts(baseUrl: string): Promise<Receipt[]> {
  return apiGet<Receipt[]>(baseUrl, "/parent-payments/receipts")
}

export interface MakePaymentResult {
  id: string
  payment_number: string
  amount: number
  payment_method: string
  payment_date?: string | null
  status: string
}

export function makeParentPayment(
  baseUrl: string,
  invoiceId: string,
  amount: number,
): Promise<MakePaymentResult> {
  return apiPost<MakePaymentResult>(baseUrl, "/parent-portal/payments", {
    invoice_id: invoiceId,
    amount,
    payment_method: "cash",
    payment_date: new Date().toISOString().slice(0, 10),
  })
}
