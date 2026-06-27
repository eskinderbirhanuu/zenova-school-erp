from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class AccountCreate(BaseModel):
    account_number: str = Field(max_length=20)
    name: str = Field(max_length=255)
    account_type: str = Field(max_length=20)
    parent_id: Optional[str] = None
    description: Optional[str] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class AccountResponse(BaseModel):
    id: str
    account_number: str
    name: str
    account_type: str
    normal_side: str
    parent_id: Optional[str] = None
    school_id: str
    is_active: bool
    description: Optional[str] = None
    created_at: Optional[datetime] = None


class JournalLineCreate(BaseModel):
    account_id: str
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None


class JournalEntryCreate(BaseModel):
    entry_date: date
    description: str
    lines: list[JournalLineCreate]


class JournalEntryResponse(BaseModel):
    id: str
    entry_number: str
    entry_date: date
    description: str
    school_id: str
    created_by: str
    is_reversed: bool
    reversed_entry_id: Optional[str] = None
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None


class JournalLineResponse(BaseModel):
    id: str
    journal_entry_id: str
    account_id: str
    debit: float
    credit: float
    description: Optional[str] = None


class FeeTypeCreate(BaseModel):
    name: str = Field(max_length=100)
    frequency: str = Field(max_length=20)
    account_id: Optional[str] = None


class FeeTypeUpdate(BaseModel):
    name: Optional[str] = None
    frequency: Optional[str] = None
    account_id: Optional[str] = None


class FeeTypeResponse(BaseModel):
    id: str
    name: str
    frequency: str
    school_id: str
    account_id: Optional[str] = None
    created_at: Optional[datetime] = None


class FeeStructureCreate(BaseModel):
    fee_type_id: str
    class_id: Optional[str] = None
    amount: float
    due_date: Optional[str] = None


class FeeStructureResponse(BaseModel):
    id: str
    fee_type_id: str
    class_id: Optional[str] = None
    amount: float
    due_date: Optional[str] = None
    created_at: Optional[datetime] = None


class FeeAssignmentCreate(BaseModel):
    student_id: str
    fee_structure_id: str
    amount: float
    academic_year_id: str
    is_waived: bool = False


class FeeAssignmentResponse(BaseModel):
    id: str
    student_id: str
    fee_structure_id: str
    amount: float
    academic_year_id: str
    is_waived: bool
    created_at: Optional[datetime] = None


class InvoiceCreate(BaseModel):
    student_id: str
    academic_year_id: str
    due_date: date
    lines: list[dict]


class InvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    student_id: str
    academic_year_id: str
    issue_date: date
    due_date: date
    total_amount: float
    paid_amount: float
    status: str
    school_id: str
    created_by: str
    created_at: Optional[datetime] = None


class PaymentCreate(BaseModel):
    invoice_id: Optional[str] = None
    student_id: Optional[str] = None
    amount: float
    payment_method: str = Field(max_length=50)
    reference: Optional[str] = None
    payment_date: date
    idempotency_key: Optional[str] = None


class PaymentResponse(BaseModel):
    id: str
    payment_number: str
    invoice_id: Optional[str] = None
    student_id: Optional[str] = None
    amount: float
    payment_method: str
    reference: Optional[str] = None
    idempotency_key: Optional[str] = None
    payment_date: date
    school_id: str
    received_by: str
    journal_entry_id: Optional[str] = None
    created_at: Optional[datetime] = None


class WalletResponse(BaseModel):
    id: str
    student_id: str
    balance: float
    created_at: Optional[datetime] = None


class WalletTransactionCreate(BaseModel):
    transaction_type: str = Field(max_length=20)
    amount: float
    reference: Optional[str] = None


class WalletTransactionResponse(BaseModel):
    id: str
    wallet_id: str
    transaction_type: str
    amount: float
    balance_before: float
    balance_after: float
    reference: Optional[str] = None
    journal_entry_id: Optional[str] = None
    created_at: Optional[datetime] = None


class ScholarshipCreate(BaseModel):
    student_id: str
    scholarship_type: str = Field(max_length=20)
    value: float
    academic_year_id: str


class ScholarshipResponse(BaseModel):
    id: str
    student_id: str
    scholarship_type: str
    value: float
    academic_year_id: str
    approved_by: Optional[str] = None
    created_at: Optional[datetime] = None


class PeriodCreate(BaseModel):
    name: str = Field(max_length=100)
    start_date: date
    end_date: date


class PeriodResponse(BaseModel):
    id: str
    name: str
    start_date: date
    end_date: date
    school_id: str
    is_locked: bool
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None
    created_at: Optional[datetime] = None


class PayrollRunCreate(BaseModel):
    name: str = Field(max_length=255)
    period_start: date
    period_end: date


class PayrollRunResponse(BaseModel):
    id: str
    name: str
    period_start: date
    period_end: date
    school_id: str
    status: str
    approved_by: Optional[str] = None
    journal_entry_id: Optional[str] = None
    created_by: str
    created_at: Optional[datetime] = None


class PayrollItemResponse(BaseModel):
    id: str
    payroll_run_id: str
    employee_id: str
    basic_salary: float
    allowances: float
    bonuses: float
    overtime: float
    tax: float
    pension: float
    loan_deduction: float
    net_pay: float


class BudgetCreate(BaseModel):
    name: str = Field(max_length=255)
    academic_year_id: str


class BudgetResponse(BaseModel):
    id: str
    name: str
    academic_year_id: str
    school_id: str
    total_amount: float
    created_by: str
    created_at: Optional[datetime] = None


class BudgetItemCreate(BaseModel):
    account_id: str
    description: str = Field(max_length=500)
    planned_amount: float


class BudgetItemResponse(BaseModel):
    id: str
    budget_id: str
    account_id: str
    description: str
    planned_amount: float
    actual_amount: float


class PurchaseRequestCreate(BaseModel):
    description: str
    department: Optional[str] = None
    estimated_amount: Optional[float] = None


class PurchaseRequestResponse(BaseModel):
    id: str
    pr_number: str
    requested_by: str
    department: Optional[str] = None
    description: str
    estimated_amount: Optional[float] = None
    status: str
    approved_by: Optional[str] = None
    school_id: str
    created_at: Optional[datetime] = None


class PurchaseOrderCreate(BaseModel):
    purchase_request_id: Optional[str] = None
    supplier: str = Field(max_length=255)
    total_amount: Optional[float] = None


class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    purchase_request_id: Optional[str] = None
    supplier: str
    total_amount: Optional[float] = None
    status: str
    school_id: str
    created_by: str
    created_at: Optional[datetime] = None


class TrialBalanceRow(BaseModel):
    account_id: str
    account_number: str
    account_name: str
    total_debit: float
    total_credit: float
    balance: float


class TrialBalanceResponse(BaseModel):
    rows: list[TrialBalanceRow]
    total_debit: float
    total_credit: float
