from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.models.payment import Payment
from app.schemas.finance import (
    AccountCreate, AccountUpdate, AccountResponse,
    JournalEntryCreate, JournalEntryResponse, JournalLineResponse,
    FeeTypeCreate, FeeTypeUpdate, FeeTypeResponse,
    FeeStructureCreate, FeeStructureResponse,
    FeeAssignmentCreate, FeeAssignmentResponse,
    InvoiceCreate, InvoiceResponse,
    PaymentCreate, PaymentResponse,
    WalletResponse, WalletTransactionCreate, WalletTransactionResponse,
    ScholarshipCreate, ScholarshipResponse,
    PeriodCreate, PeriodResponse,
    PayrollRunCreate, PayrollRunResponse,
    BudgetCreate, BudgetResponse, BudgetItemCreate, BudgetItemResponse,
    PurchaseRequestCreate, PurchaseRequestResponse,
    PurchaseOrderCreate, PurchaseOrderResponse,
    TrialBalanceResponse,
)
from app.core.pagination import paginate, build_paginated_response
from app.models.account import Account
from app.models.fee import FeeType, FeeStructure, FeeAssignment
from app.models.scholarship import Scholarship
from app.models.period import AccountingPeriod
from app.models.budget import Budget, BudgetItem
from app.models.payroll import PayrollRun
from app.services import finance_service
from app.utils.excel import parse_excel, excel_response

router = APIRouter()

FINANCE = [require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)]
FINANCE_DIRECTOR = [require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)]
FINANCE_ADMIN = [require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)]
VIEW_FINANCE = [require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS, Permission.AUDIT_VIEW)]


@router.post("/accounts", response_model=AccountResponse, dependencies=FINANCE)
def create_account(data: AccountCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_account(db, current_user.school_id, data, current_user.id)


@router.get("/accounts", dependencies=VIEW_FINANCE)
def list_accounts(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(Account).filter(Account.school_id == current_user.school_id, Account.is_active == True)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(Account.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[AccountResponse.model_validate(a) for a in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.patch("/accounts/{account_id}", response_model=AccountResponse, dependencies=FINANCE)
def update_account(account_id: str, data: AccountUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.update_account(db, account_id, data, current_user.id, current_user.school_id)


@router.post("/journal-entries", response_model=JournalEntryResponse, dependencies=FINANCE)
def create_journal_entry(data: JournalEntryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_journal_entry(db, current_user.school_id, data, current_user.id)


@router.get("/journal-entries", response_model=list[JournalEntryResponse], dependencies=VIEW_FINANCE)
def list_journal_entries(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_journal_entries(db, current_user.school_id, limit, include_deleted=include_deleted, skip=skip)


@router.get("/journal-entries/{entry_id}/lines", response_model=list[JournalLineResponse], dependencies=VIEW_FINANCE)
def get_journal_lines(entry_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_journal_lines(db, entry_id, current_user.school_id, include_deleted=include_deleted)


@router.post("/journal-entries/{entry_id}/reverse", dependencies=FINANCE_DIRECTOR)
def reverse_entry(entry_id: str, reason: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.reverse_journal_entry(db, entry_id, reason, current_user.id, current_user.school_id)
    return {"message": "Entry reversed"}


@router.post("/fee-types", response_model=FeeTypeResponse, dependencies=FINANCE)
def create_fee_type(data: FeeTypeCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_fee_type(db, current_user.school_id, data, current_user.id)


@router.get("/fee-types", dependencies=VIEW_FINANCE)
def list_fee_types(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(FeeType).filter(FeeType.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(FeeType.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[FeeTypeResponse.model_validate(ft) for ft in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.patch("/fee-types/{fee_type_id}", response_model=FeeTypeResponse, dependencies=FINANCE)
def update_fee_type(fee_type_id: str, data: FeeTypeUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.update_fee_type(db, fee_type_id, data, current_user.id, current_user.school_id)


@router.delete("/fee-types/{fee_type_id}", dependencies=FINANCE)
def delete_fee_type(fee_type_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.delete_fee_type(db, fee_type_id, current_user.id, current_user.school_id)
    return {"message": "Fee type deleted"}


@router.post("/fee-structures", response_model=FeeStructureResponse, dependencies=FINANCE)
def create_fee_structure(data: FeeStructureCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_fee_structure(db, data, current_user.id, current_user.school_id)


@router.get("/fee-structures", dependencies=VIEW_FINANCE)
def list_fee_structures(
    fee_type_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(FeeStructure).join(FeeType).filter(FeeType.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if fee_type_id:
        q = q.filter(FeeStructure.fee_type_id == fee_type_id)
    q = q.order_by(FeeStructure.id)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[FeeStructureResponse.model_validate(fs) for fs in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/fee-assignments", response_model=FeeAssignmentResponse, dependencies=FINANCE)
def assign_fee(data: FeeAssignmentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.assign_fee(db, data, current_user.id, current_user.school_id)


@router.get("/fee-assignments", dependencies=VIEW_FINANCE)
def list_fee_assignments(
    student_id: str = Query(None), academic_year_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(FeeAssignment).join(FeeStructure, FeeAssignment.fee_structure_id == FeeStructure.id).join(FeeType).filter(FeeType.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if student_id:
        q = q.filter(FeeAssignment.student_id == student_id)
    if academic_year_id:
        q = q.filter(FeeAssignment.academic_year_id == academic_year_id)
    q = q.order_by(FeeAssignment.id)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[FeeAssignmentResponse.model_validate(fa) for fa in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/invoices", response_model=InvoiceResponse, dependencies=FINANCE)
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_invoice(db, current_user.school_id, data, current_user.id)


@router.get("/invoices", response_model=list[InvoiceResponse], dependencies=VIEW_FINANCE)
def list_invoices(
    student_id: str = Query(None), status: str = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_invoices(db, current_user.school_id, student_id, status, include_deleted=include_deleted, skip=skip, limit=limit)


@router.post("/payments", response_model=PaymentResponse, dependencies=FINANCE)
def record_payment(data: PaymentCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not data.idempotency_key:
        raise HTTPException(status_code=400, detail="idempotency_key is required to prevent duplicate payments")
    return finance_service.record_payment(db, current_user.school_id, data, current_user.id)


@router.get("/payments", response_model=list[PaymentResponse], dependencies=VIEW_FINANCE)
def list_payments(
    invoice_id: str = Query(None), student_id: str = Query(None),
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_payments(db, current_user.school_id, invoice_id, student_id, include_deleted=include_deleted, skip=skip, limit=limit)


@router.get("/wallet/{student_id}", response_model=WalletResponse, dependencies=VIEW_FINANCE)
def get_wallet(student_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.get_wallet(db, student_id, current_user.school_id)


@router.post("/wallet/{student_id}/transactions", response_model=WalletTransactionResponse, dependencies=FINANCE)
def wallet_transaction(student_id: str, data: WalletTransactionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.wallet_transaction(db, student_id, current_user.school_id, data, current_user.id)


@router.get("/wallet/{student_id}/transactions", response_model=list[WalletTransactionResponse], dependencies=VIEW_FINANCE)
def wallet_transactions(student_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    w = finance_service.get_wallet(db, student_id, current_user.school_id)
    return finance_service.get_wallet_transactions(db, w.id, current_user.school_id, include_deleted=include_deleted)


@router.post("/scholarships", response_model=ScholarshipResponse, dependencies=FINANCE_DIRECTOR)
def create_scholarship(data: ScholarshipCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_scholarship(db, data, current_user.id, current_user.school_id)


@router.get("/scholarships", dependencies=VIEW_FINANCE)
def list_scholarships(
    student_id: str = Query(None), academic_year_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(Scholarship).filter(Scholarship.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if student_id:
        q = q.filter(Scholarship.student_id == student_id)
    if academic_year_id:
        q = q.filter(Scholarship.academic_year_id == academic_year_id)
    q = q.order_by(Scholarship.id)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[ScholarshipResponse.model_validate(s) for s in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/periods", response_model=PeriodResponse, dependencies=FINANCE)
def create_period(data: PeriodCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_period(db, current_user.school_id, data, current_user.id)


@router.get("/periods", dependencies=VIEW_FINANCE)
def list_periods(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(AccountingPeriod).filter(AccountingPeriod.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(AccountingPeriod.start_date.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[PeriodResponse.model_validate(p) for p in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/periods/{period_id}/lock", dependencies=FINANCE)
def lock_period(period_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.lock_period(db, period_id, current_user.id, current_user.school_id)
    return {"message": "Period locked"}


@router.post("/periods/{period_id}/unlock", dependencies=[require_permission(Permission.LICENSE_MANAGE)])
def unlock_period(period_id: str, reason: str = Query(...), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.unlock_period(db, period_id, current_user.id, reason, school_id=current_user.school_id)
    return {"message": "Period unlocked"}


@router.post("/payroll-runs", response_model=PayrollRunResponse, dependencies=FINANCE)
def create_payroll_run(data: PayrollRunCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_payroll_run(db, current_user.school_id, data, current_user.id)


@router.get("/payroll-runs", dependencies=VIEW_FINANCE)
def list_payroll_runs(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(PayrollRun).filter(PayrollRun.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(PayrollRun.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[PayrollRunResponse.model_validate(pr) for pr in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/payroll-runs/{run_id}/approve", dependencies=FINANCE_DIRECTOR)
def approve_payroll(run_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.approve_payroll(db, run_id, current_user.id, current_user.school_id)
    return {"message": "Payroll approved"}


@router.post("/budgets", response_model=BudgetResponse, dependencies=FINANCE)
def create_budget(data: BudgetCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_budget(db, current_user.school_id, data, current_user.id)


@router.get("/budgets", dependencies=VIEW_FINANCE)
def list_budgets(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(Budget).filter(Budget.school_id == current_user.school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(Budget.id)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[BudgetResponse.model_validate(b) for b in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/budgets/{budget_id}/items", response_model=BudgetItemResponse, dependencies=FINANCE)
def create_budget_item(budget_id: str, data: BudgetItemCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_budget_item(db, budget_id, data, current_user.id, current_user.school_id)


@router.get("/budgets/{budget_id}/items", dependencies=VIEW_FINANCE)
def list_budget_items(
    budget_id: str,
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    q = db.query(BudgetItem).join(Budget).filter(
        BudgetItem.budget_id == budget_id, Budget.school_id == current_user.school_id
    )
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    q = q.order_by(BudgetItem.id)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[BudgetItemResponse.model_validate(bi) for bi in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/purchase-requests", response_model=PurchaseRequestResponse, dependencies=[require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS, Permission.INVENTORY_MANAGE)])
def create_purchase_request(data: PurchaseRequestCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_purchase_request(db, current_user.school_id, data, current_user.id)


@router.get("/purchase-requests", response_model=list[PurchaseRequestResponse], dependencies=VIEW_FINANCE)
def list_purchase_requests(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_purchase_requests(db, current_user.school_id, include_deleted=include_deleted, skip=skip, limit=limit)


@router.post("/purchase-requests/{pr_id}/approve", dependencies=FINANCE_DIRECTOR)
def approve_purchase_request(pr_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    finance_service.approve_purchase_request(db, pr_id, current_user.id, current_user.school_id)
    return {"message": "Purchase request approved"}


@router.post("/purchase-orders", response_model=PurchaseOrderResponse, dependencies=[require_permission(Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS, Permission.INVENTORY_MANAGE)])
def create_purchase_order(data: PurchaseOrderCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.create_purchase_order(db, current_user.school_id, data, current_user.id)


@router.get("/purchase-orders", response_model=list[PurchaseOrderResponse], dependencies=VIEW_FINANCE)
def list_purchase_orders(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return finance_service.get_purchase_orders(db, current_user.school_id, include_deleted=include_deleted, skip=skip, limit=limit)


@router.get("/reports/trial-balance", response_model=TrialBalanceResponse, dependencies=VIEW_FINANCE)
def trial_balance(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return finance_service.trial_balance(db, current_user.school_id)


@router.post("/payments/import-excel", dependencies=FINANCE)
def import_payments_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    data = parse_excel(file)
    created = []
    for row in data:
        payment = Payment(
            invoice_id=row.get("invoice_id"),
            student_id=row.get("student_id"),
            amount=row.get("amount"),
            payment_method=row.get("payment_method", "cash"),
            reference=row.get("reference"),
            payment_date=row.get("payment_date"),
            school_id=current_user.school_id,
            received_by=current_user.id,
        )
        db.add(payment)
        created.append(payment)
    db.commit()
    for p in created:
        db.refresh(p)
    return {"message": f"{len(created)} payments imported", "count": len(created)}


@router.get("/payments/export-excel", dependencies=VIEW_FINANCE)
def export_payments_excel(
    invoice_id: str = Query(None),
    student_id: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    payments = finance_service.get_payments(db, current_user.school_id, invoice_id, student_id)
    headers = ["Payment Number", "Invoice ID", "Student ID", "Amount", "Method", "Reference", "Date", "Status"]
    rows = []
    for p in payments:
        rows.append([p.payment_number, p.invoice_id or "", p.student_id or "", str(p.amount),
                     p.payment_method, p.reference or "", str(p.payment_date), p.status])
    return excel_response(headers, rows, "payments.xlsx")


@router.get("/invoices/export-excel", dependencies=VIEW_FINANCE)
def export_invoices_excel(
    student_id: str = Query(None),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    invoices = finance_service.get_invoices(db, current_user.school_id, student_id, status)
    headers = ["Invoice Number", "Student ID", "Issue Date", "Due Date", "Total Amount", "Paid Amount", "Status"]
    rows = []
    for inv in invoices:
        rows.append([inv.invoice_number, inv.student_id or "", str(inv.issue_date), str(inv.due_date),
                     str(inv.total_amount), str(inv.paid_amount), inv.status])
    return excel_response(headers, rows, "invoices.xlsx")
