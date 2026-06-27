import uuid
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.account import Account
from app.models.journal import JournalEntry, JournalLine
from app.models.fee import FeeType, FeeStructure, FeeAssignment
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.student import Student
from app.models.wallet import Wallet, WalletTransaction
from app.models.scholarship import Scholarship
from app.models.period import AccountingPeriod
from app.models.payroll import PayrollRun, PayrollItem
from app.models.budget import Budget, BudgetItem
from app.models.procurement import PurchaseRequest, PurchaseOrder, GoodsReceipt
from app.core.audit import log_audit


ACCOUNT_TYPE_MAP = {
    "asset": "debit", "liability": "credit",
    "equity": "credit", "revenue": "credit", "expense": "debit",
}


def get_accounts(db: Session, school_id: str):
    return db.query(Account).filter(Account.school_id == school_id, Account.is_active == True).all()


def create_account(db: Session, school_id: str, data, user_id: str):
    normal = ACCOUNT_TYPE_MAP.get(data.account_type.lower())
    if not normal:
        raise HTTPException(status_code=400, detail=f"Invalid account type: {data.account_type}")
    acct = Account(
        account_number=data.account_number, name=data.name,
        account_type=data.account_type.lower(), normal_side=normal,
        parent_id=data.parent_id, school_id=school_id, description=data.description,
    )
    db.add(acct)
    db.commit()
    db.refresh(acct)
    log_audit(db, user_id, "ACCOUNT_CREATED", "account", acct.id, f"Account '{data.name}' ({data.account_number}) created")
    return acct


def update_account(db: Session, account_id: str, data, user_id: str):
    acct = db.query(Account).filter(Account.id == account_id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Account not found")
    if data.name is not None:
        acct.name = data.name
    if data.is_active is not None:
        acct.is_active = data.is_active
    if data.description is not None:
        acct.description = data.description
    db.commit()
    db.refresh(acct)
    log_audit(db, user_id, "ACCOUNT_UPDATED", "account", account_id, f"Account '{acct.account_number}' updated")
    return acct


def _check_period(db: Session, entry_date, school_id: str):
    period = db.query(AccountingPeriod).filter(
        AccountingPeriod.school_id == school_id,
        AccountingPeriod.start_date <= entry_date,
        AccountingPeriod.end_date >= entry_date,
        AccountingPeriod.is_locked == True,
    ).first()
    if period:
        raise HTTPException(status_code=400, detail=f"Period '{period.name}' is locked. No entries allowed.")


def _next_entry_number(db: Session, school_id: str) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(JournalEntry).filter(
        JournalEntry.school_id == school_id,
        JournalEntry.entry_number.like(f"JE-{year}-%")
    ).count()
    return f"JE-{year}-{count + 1:05d}"


def create_journal_entry(db: Session, school_id: str, data, user_id: str):
    _check_period(db, data.entry_date, school_id)
    if len(data.lines) < 2:
        raise HTTPException(status_code=400, detail="Journal entry must have at least 2 lines")
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    for line in data.lines:
        acct = db.query(Account).filter(Account.id == line.account_id, Account.is_active == True).first()
        if not acct:
            raise HTTPException(status_code=400, detail=f"Account {line.account_id} not found or inactive")
        if line.debit > 0 and line.credit > 0:
            raise HTTPException(status_code=400, detail="Line cannot have both debit and credit")
        total_debit += Decimal(str(line.debit))
        total_credit += Decimal(str(line.credit))
    if abs(total_debit - total_credit) > Decimal("0.001"):
        raise HTTPException(status_code=400, detail=f"Debit ({total_debit}) must equal Credit ({total_credit})")
    entry = JournalEntry(
        entry_number=_next_entry_number(db, school_id),
        entry_date=data.entry_date, description=data.description,
        school_id=school_id, created_by=user_id,
    )
    db.add(entry)
    db.flush()
    for line in data.lines:
        jl = JournalLine(
            journal_entry_id=entry.id, account_id=line.account_id,
            debit=Decimal(str(line.debit)),
            credit=Decimal(str(line.credit)),
            description=line.description,
        )
        db.add(jl)
    db.commit()
    db.refresh(entry)
    log_audit(db, user_id, "JOURNAL_POSTED", "journal_entry", entry.id,
              f"Entry {entry.entry_number}: Debit {total_debit}, Credit {total_credit}")
    return entry


def reverse_journal_entry(db: Session, entry_id: str, reason: str, user_id: str):
    original = db.query(JournalEntry).filter(JournalEntry.id == entry_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    if original.is_reversed:
        raise HTTPException(status_code=400, detail="Entry already reversed")
    lines = db.query(JournalLine).filter(JournalLine.journal_entry_id == entry_id).all()
    reverse_lines = []
    for line in lines:
        reverse_lines.append(type("RL", (), {"account_id": line.account_id, "debit": float(line.credit), "credit": float(line.debit), "description": f"Reversal: {reason}"})())
    rev_data = type("RD", (), {"entry_date": datetime.now(timezone.utc).date(), "description": f"Reversal of {original.entry_number}: {reason}", "lines": reverse_lines})()
    rev_entry = create_journal_entry(db, original.school_id, rev_data, user_id)
    original.is_reversed = True
    original.reversed_entry_id = rev_entry.id
    db.commit()
    log_audit(db, user_id, "JOURNAL_REVERSED", "journal_entry", entry_id, f"Reversed by {rev_entry.entry_number}: {reason}")
    return original


def get_journal_entries(db: Session, school_id: str, limit: int = 50):
    return db.query(JournalEntry).filter(JournalEntry.school_id == school_id).order_by(JournalEntry.created_at.desc()).limit(limit).all()


def get_journal_lines(db: Session, entry_id: str):
    return db.query(JournalLine).filter(JournalLine.journal_entry_id == entry_id).all()


def create_fee_type(db: Session, school_id: str, data, user_id: str):
    ft = FeeType(name=data.name, frequency=data.frequency, school_id=school_id, account_id=data.account_id)
    db.add(ft)
    db.commit()
    db.refresh(ft)
    log_audit(db, user_id, "FEE_TYPE_CREATED", "fee_type", ft.id, f"Fee type '{data.name}' created")
    return ft


def get_fee_types(db: Session, school_id: str):
    return db.query(FeeType).filter(FeeType.school_id == school_id).all()


def update_fee_type(db: Session, fee_type_id: str, data, user_id: str):
    ft = db.query(FeeType).filter(FeeType.id == fee_type_id).first()
    if not ft:
        raise HTTPException(status_code=404, detail="Fee type not found")
    if data.name is not None:
        ft.name = data.name
    if data.frequency is not None:
        ft.frequency = data.frequency
    if data.account_id is not None:
        ft.account_id = data.account_id
    db.commit()
    db.refresh(ft)
    log_audit(db, user_id, "FEE_TYPE_UPDATED", "fee_type", ft.id, f"Fee type '{ft.name}' updated")
    return ft


def delete_fee_type(db: Session, fee_type_id: str, user_id: str):
    ft = db.query(FeeType).filter(FeeType.id == fee_type_id).first()
    if not ft:
        raise HTTPException(status_code=404, detail="Fee type not found")
    db.delete(ft)
    db.commit()
    log_audit(db, user_id, "FEE_TYPE_DELETED", "fee_type", fee_type_id, "Fee type deleted")


def create_fee_structure(db: Session, data, user_id: str):
    fs = FeeStructure(fee_type_id=data.fee_type_id, class_id=data.class_id, amount=Decimal(str(data.amount)), due_date=data.due_date)
    db.add(fs)
    db.commit()
    db.refresh(fs)
    log_audit(db, user_id, "FEE_STRUCTURE_CREATED", "fee_structure", fs.id, "Fee structure created")
    return fs


def get_fee_structures(db: Session, fee_type_id: str = None):
    q = db.query(FeeStructure)
    if fee_type_id:
        q = q.filter(FeeStructure.fee_type_id == fee_type_id)
    return q.all()


def assign_fee(db: Session, data, user_id: str):
    fa = FeeAssignment(
        student_id=data.student_id, fee_structure_id=data.fee_structure_id,
        amount=Decimal(str(data.amount)), academic_year_id=data.academic_year_id,
        is_waived=data.is_waived,
    )
    db.add(fa)
    db.commit()
    db.refresh(fa)
    log_audit(db, user_id, "FEE_ASSIGNED", "fee_assignment", fa.id, f"Fee assigned to student {data.student_id}")
    return fa


def get_fee_assignments(db: Session, student_id: str = None, academic_year_id: str = None):
    q = db.query(FeeAssignment)
    if student_id:
        q = q.filter(FeeAssignment.student_id == student_id)
    if academic_year_id:
        q = q.filter(FeeAssignment.academic_year_id == academic_year_id)
    return q.all()


def _next_invoice_number(db: Session, school_id: str) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Invoice).filter(
        Invoice.school_id == school_id,
        Invoice.invoice_number.like(f"INV-{year}-%")
    ).count()
    return f"INV-{year}-{count + 1:05d}"


def create_invoice(db: Session, school_id: str, data, user_id: str):
    total = Decimal("0.00")
    for line in data.lines:
        total += Decimal(str(line["amount"]))
    invoice = Invoice(
        invoice_number=_next_invoice_number(db, school_id),
        student_id=data.student_id, academic_year_id=data.academic_year_id,
        issue_date=datetime.now(timezone.utc).date(), due_date=data.due_date,
        total_amount=total, school_id=school_id, created_by=user_id,
    )
    db.add(invoice)
    db.flush()
    for line in data.lines:
        il = InvoiceLine(
            invoice_id=invoice.id, fee_assignment_id=line.get("fee_assignment_id"),
            description=line["description"], amount=Decimal(str(line["amount"])),
        )
        db.add(il)
    db.commit()
    db.refresh(invoice)
    log_audit(db, user_id, "INVOICE_CREATED", "invoice", invoice.id, f"Invoice {invoice.invoice_number} created for student {data.student_id}")
    return invoice


def get_invoices(db: Session, school_id: str, student_id: str = None, status: str = None):
    q = db.query(Invoice).filter(Invoice.school_id == school_id)
    if student_id:
        q = q.filter(Invoice.student_id == student_id)
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).all()


def _next_payment_number(db: Session, school_id: str) -> str:
    year = datetime.now(timezone.utc).year
    count = db.query(Payment).filter(
        Payment.school_id == school_id,
        Payment.payment_number.like(f"PAY-{year}-%")
    ).count()
    return f"PAY-{year}-{count + 1:05d}"


def record_payment(db: Session, school_id: str, data, user_id: str):
    _check_period(db, data.payment_date, school_id)
    if data.idempotency_key:
        existing = db.query(Payment).filter(
            Payment.school_id == school_id,
            Payment.idempotency_key == data.idempotency_key
        ).first()
        if existing:
            return existing
    payment = Payment(
        payment_number=_next_payment_number(db, school_id),
        invoice_id=data.invoice_id, student_id=data.student_id,
        amount=Decimal(str(data.amount)), payment_method=data.payment_method,
        reference=data.reference, payment_date=data.payment_date,
        idempotency_key=data.idempotency_key,
        school_id=school_id, received_by=user_id,
    )
    db.add(payment)
    if data.invoice_id:
        inv = db.query(Invoice).filter(Invoice.id == data.invoice_id).with_for_update().first()
        if inv:
            total_paid = Decimal(str(inv.paid_amount)) + Decimal(str(data.amount))
            if total_paid > inv.total_amount:
                raise HTTPException(status_code=400, detail=f"Payment would exceed invoice balance ({inv.total_amount})")
            inv.paid_amount = total_paid
            if inv.paid_amount >= inv.total_amount:
                inv.status = "paid"
            elif inv.paid_amount > 0:
                inv.status = "partial"
    db.flush()
    je = _create_payment_journal_entry(db, school_id, payment, user_id)
    payment.journal_entry_id = je.id
    db.commit()
    db.refresh(payment)
    log_audit(db, user_id, "PAYMENT_RECEIVED", "payment", payment.id,
              f"Payment {payment.payment_number}: {data.amount} via {data.payment_method}")
    return payment


def _create_payment_journal_entry(db: Session, school_id: str, payment, user_id: str):
    cash_acct = db.query(Account).filter(
        Account.school_id == school_id, Account.name == "Cash on Hand", Account.is_active == True
    ).first()
    if not cash_acct:
        cash_acct = Account(account_number="1001", name="Cash on Hand", account_type="asset",
                            normal_side="debit", school_id=school_id, is_active=True)
        db.add(cash_acct)
        db.flush()
    receivable_acct = db.query(Account).filter(
        Account.school_id == school_id, Account.name == "Student Fees Receivable", Account.is_active == True
    ).first()
    if not receivable_acct:
        receivable_acct = Account(account_number="1201", name="Student Fees Receivable", account_type="asset",
                                  normal_side="debit", school_id=school_id, is_active=True)
        db.add(receivable_acct)
        db.flush()
    entry = JournalEntry(
        entry_number=_next_entry_number(db, school_id),
        entry_date=payment.payment_date,
        description=f"Payment {payment.payment_number}: {payment.payment_method}",
        school_id=school_id, created_by=user_id,
    )
    db.add(entry)
    db.flush()
    amt = Decimal(str(payment.amount))
    db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, debit=amt, credit=0,
                       description=payment.payment_number))
    db.add(JournalLine(journal_entry_id=entry.id, account_id=receivable_acct.id, debit=0, credit=amt,
                       description=payment.payment_number))
    return entry


def get_payments(db: Session, school_id: str, invoice_id: str = None, student_id: str = None):
    q = db.query(Payment).filter(Payment.school_id == school_id)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    if student_id:
        q = q.filter(Payment.student_id == student_id)
    return q.order_by(Payment.created_at.desc()).all()


def get_wallet(db: Session, student_id: str) -> Wallet:
    w = db.query(Wallet).filter(Wallet.student_id == student_id).first()
    if not w:
        w = Wallet(student_id=student_id, balance=Decimal("0.00"))
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


def wallet_transaction(db: Session, student_id: str, data, user_id: str) -> WalletTransaction:
    w = get_wallet(db, student_id)
    bal = Decimal(str(w.balance))
    amt = Decimal(str(data.amount))
    if data.transaction_type in ("payment", "withdrawal") and bal < amt:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")
    delta = amt if data.transaction_type in ("top_up", "refund") else -amt
    new_bal = bal + delta
    wt = WalletTransaction(
        wallet_id=w.id, transaction_type=data.transaction_type,
        amount=amt, balance_before=bal, balance_after=new_bal,
        reference=data.reference,
    )
    w.balance = new_bal
    db.add(wt)
    db.flush()
    student = db.query(Student).filter(Student.id == w.student_id).first()
    school_id = student.school_id if student else None
    if school_id:
        _check_period(db, datetime.now(timezone.utc).date(), school_id)
    je = _create_wallet_journal_entry(db, w, wt, user_id)
    wt.journal_entry_id = je.id
    db.commit()
    db.refresh(wt)
    log_audit(db, user_id, "WALLET_TRANSACTION", "wallet_transaction", wt.id,
              f"Wallet {data.transaction_type}: {data.amount}")
    return wt


def _create_wallet_journal_entry(db: Session, wallet, wt, user_id: str):
    student = db.query(Student).filter(Student.id == wallet.student_id).first()
    school_id = student.school_id if student else "default"
    cash_acct = db.query(Account).filter(
        Account.school_id == school_id, Account.name == "Cash on Hand", Account.is_active == True
    ).first()
    if not cash_acct:
        cash_acct = Account(account_number="1001", name="Cash on Hand", account_type="asset",
                            normal_side="debit", school_id=school_id, is_active=True)
        db.add(cash_acct)
        db.flush()
    deposit_acct = db.query(Account).filter(
        Account.school_id == school_id, Account.name == "Customer Deposits", Account.is_active == True
    ).first()
    if not deposit_acct:
        deposit_acct = Account(account_number="2101", name="Customer Deposits", account_type="liability",
                               normal_side="credit", school_id=school_id, is_active=True)
        db.add(deposit_acct)
        db.flush()
    entry = JournalEntry(
        entry_number=_next_entry_number(db, school_id),
        entry_date=datetime.now(timezone.utc).date(),
        description=f"Wallet {wt.transaction_type}: {wt.amount}",
        school_id=school_id, created_by=user_id,
    )
    db.add(entry)
    db.flush()
    amt = Decimal(str(wt.amount))
    if wt.transaction_type in ("top_up", "refund"):
        db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, debit=amt, credit=0,
                           description=f"Wallet {wt.transaction_type}"))
        db.add(JournalLine(journal_entry_id=entry.id, account_id=deposit_acct.id, debit=0, credit=amt,
                           description=f"Wallet {wt.transaction_type}"))
    else:
        db.add(JournalLine(journal_entry_id=entry.id, account_id=deposit_acct.id, debit=amt, credit=0,
                           description=f"Wallet {wt.transaction_type}"))
        db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, debit=0, credit=amt,
                           description=f"Wallet {wt.transaction_type}"))
    return entry


def get_wallet_transactions(db: Session, wallet_id: str):
    return db.query(WalletTransaction).filter(WalletTransaction.wallet_id == wallet_id).order_by(WalletTransaction.created_at.desc()).all()


def create_scholarship(db: Session, data, user_id: str, approved_by: str = None):
    s = Scholarship(
        student_id=data.student_id, scholarship_type=data.scholarship_type,
        value=Decimal(str(data.value)), academic_year_id=data.academic_year_id,
        approved_by=approved_by,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    log_audit(db, user_id, "SCHOLARSHIP_CREATED", "scholarship", s.id, f"Scholarship for student {data.student_id}")
    return s


def get_scholarships(db: Session, student_id: str = None, academic_year_id: str = None):
    q = db.query(Scholarship)
    if student_id:
        q = q.filter(Scholarship.student_id == student_id)
    if academic_year_id:
        q = q.filter(Scholarship.academic_year_id == academic_year_id)
    return q.all()


def create_period(db: Session, school_id: str, data, user_id: str):
    p = AccountingPeriod(name=data.name, start_date=data.start_date, end_date=data.end_date, school_id=school_id)
    db.add(p)
    db.commit()
    db.refresh(p)
    log_audit(db, user_id, "PERIOD_CREATED", "accounting_period", p.id, f"Period '{data.name}' created")
    return p


def lock_period(db: Session, period_id: str, user_id: str):
    p = db.query(AccountingPeriod).filter(AccountingPeriod.id == period_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Period not found")
    p.is_locked = True
    p.locked_by = user_id
    p.locked_at = datetime.now(timezone.utc)
    db.commit()
    log_audit(db, user_id, "PERIOD_LOCKED", "accounting_period", period_id, "Period locked")
    return p


def unlock_period(db: Session, period_id: str, user_id: str, reason: str):
    p = db.query(AccountingPeriod).filter(AccountingPeriod.id == period_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Period not found")
    p.is_locked = False
    p.locked_by = None
    p.locked_at = None
    db.commit()
    log_audit(db, user_id, "PERIOD_UNLOCKED", "accounting_period", period_id, f"Unlocked: {reason}")
    return p


def get_periods(db: Session, school_id: str):
    return db.query(AccountingPeriod).filter(AccountingPeriod.school_id == school_id).order_by(AccountingPeriod.start_date.desc()).all()


def create_payroll_run(db: Session, school_id: str, data, user_id: str):
    pr = PayrollRun(name=data.name, period_start=data.period_start, period_end=data.period_end, school_id=school_id, created_by=user_id)
    db.add(pr)
    db.commit()
    db.refresh(pr)
    log_audit(db, user_id, "PAYROLL_CREATED", "payroll_run", pr.id, f"Payroll '{data.name}' created")
    return pr


def get_payroll_runs(db: Session, school_id: str):
    return db.query(PayrollRun).filter(PayrollRun.school_id == school_id).order_by(PayrollRun.created_at.desc()).all()


def approve_payroll(db: Session, run_id: str, user_id: str):
    pr = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    pr.status = "approved"
    pr.approved_by = user_id
    db.commit()
    log_audit(db, user_id, "PAYROLL_APPROVED", "payroll_run", run_id, "Payroll approved")
    return pr


def create_budget(db: Session, school_id: str, data, user_id: str):
    b = Budget(name=data.name, academic_year_id=data.academic_year_id, school_id=school_id, created_by=user_id)
    db.add(b)
    db.commit()
    db.refresh(b)
    log_audit(db, user_id, "BUDGET_CREATED", "budget", b.id, f"Budget '{data.name}' created")
    return b


def get_budgets(db: Session, school_id: str):
    return db.query(Budget).filter(Budget.school_id == school_id).all()


def create_budget_item(db: Session, budget_id: str, data, user_id: str):
    bi = BudgetItem(budget_id=budget_id, account_id=data.account_id, description=data.description, planned_amount=Decimal(str(data.planned_amount)))
    db.add(bi)
    budget = db.query(Budget).filter(Budget.id == budget_id).first()
    if budget:
        budget.total_amount = Decimal(str(budget.total_amount)) + Decimal(str(data.planned_amount))
    db.commit()
    db.refresh(bi)
    log_audit(db, user_id, "BUDGET_ITEM_CREATED", "budget_item", bi.id, "Budget item created")
    return bi


def get_budget_items(db: Session, budget_id: str):
    return db.query(BudgetItem).filter(BudgetItem.budget_id == budget_id).all()


def create_purchase_request(db: Session, school_id: str, data, user_id: str):
    count = db.query(PurchaseRequest).filter(PurchaseRequest.school_id == school_id).count()
    pr = PurchaseRequest(
        pr_number=f"PR-{count + 1:05d}",
        requested_by=user_id, department=data.department,
        description=data.description, estimated_amount=Decimal(str(data.estimated_amount)) if data.estimated_amount else None,
        school_id=school_id,
    )
    db.add(pr)
    db.commit()
    db.refresh(pr)
    log_audit(db, user_id, "PURCHASE_REQUEST_CREATED", "purchase_request", pr.id, f"PR {pr.pr_number} created")
    return pr


def get_purchase_requests(db: Session, school_id: str):
    return db.query(PurchaseRequest).filter(PurchaseRequest.school_id == school_id).order_by(PurchaseRequest.created_at.desc()).all()


def approve_purchase_request(db: Session, pr_id: str, user_id: str):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")
    pr.status = "approved"
    pr.approved_by = user_id
    db.commit()
    log_audit(db, user_id, "PURCHASE_REQUEST_APPROVED", "purchase_request", pr_id, "PR approved")
    return pr


def create_purchase_order(db: Session, school_id: str, data, user_id: str):
    count = db.query(PurchaseOrder).filter(PurchaseOrder.school_id == school_id).count()
    po = PurchaseOrder(
        po_number=f"PO-{count + 1:05d}",
        purchase_request_id=data.purchase_request_id, supplier=data.supplier,
        total_amount=Decimal(str(data.total_amount)) if data.total_amount else None,
        school_id=school_id, created_by=user_id,
    )
    db.add(po)
    db.commit()
    db.refresh(po)
    log_audit(db, user_id, "PURCHASE_ORDER_CREATED", "purchase_order", po.id, f"PO {po.po_number} created")
    return po


def get_purchase_orders(db: Session, school_id: str):
    return db.query(PurchaseOrder).filter(PurchaseOrder.school_id == school_id).order_by(PurchaseOrder.created_at.desc()).all()


def trial_balance(db: Session, school_id: str):
    accounts = db.query(Account).filter(Account.school_id == school_id, Account.is_active == True).all()
    rows = []
    for acct in accounts:
        lines = db.query(JournalLine).join(JournalEntry).filter(
            JournalLine.account_id == acct.id,
            JournalEntry.school_id == school_id,
        ).all()
        td = sum(Decimal(str(l.debit)) for l in lines)
        tc = sum(Decimal(str(l.credit)) for l in lines)
        balance = td - tc if acct.normal_side == "debit" else tc - td
        rows.append({
            "account_id": acct.id, "account_number": acct.account_number,
            "account_name": acct.name, "total_debit": float(td),
            "total_credit": float(tc), "balance": float(balance),
        })
    total_debit = sum(r["total_debit"] for r in rows)
    total_credit = sum(r["total_credit"] for r in rows)
    return {"rows": rows, "total_debit": total_debit, "total_credit": total_credit}
