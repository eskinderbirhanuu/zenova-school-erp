from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.account import Account
from app.models.journal import JournalEntry, JournalLine
from app.models.fee import FeeType, FeeStructure, FeeAssignment
from app.models.invoice import Invoice, InvoiceLine
from app.models.payment import Payment
from app.models.student import Student
from app.models.wallet import Wallet, WalletTransaction
from app.models.scholarship import Scholarship
from app.models.period import AccountingPeriod
from app.models.payroll import PayrollRun
from app.models.budget import Budget, BudgetItem
from app.models.procurement import PurchaseRequest, PurchaseOrder
from app.core.audit import log_audit
from app.services.sync_service import enqueue_sync
from app.models.number_sequence import NumberSequence


ACCOUNT_TYPE_MAP = {
    "asset": "debit", "liability": "credit",
    "equity": "credit", "revenue": "credit", "expense": "debit",
}


def _next_sequence_number(db: Session, prefix: str, school_id: str) -> str:
    """Race-free document-number generator using the locked NumberSequence table.

    Replaces the old count()-based generators that produced duplicate numbers
    under concurrent inserts. Atomically reserves the next sequence value by
    locking the per-(prefix, school, year) row.
    """
    year = datetime.now(timezone.utc).year
    seq = db.query(NumberSequence).filter(
        NumberSequence.prefix == prefix,
        NumberSequence.school_id == school_id,
        NumberSequence.year == year,
    ).with_for_update().first()
    if not seq:
        seq = NumberSequence(prefix=prefix, school_id=school_id, year=year, last_number=0)
        db.add(seq)
        db.flush()
        # Re-lock after create so a concurrent creator cannot share this slot.
        seq = db.query(NumberSequence).filter(
            NumberSequence.prefix == prefix,
            NumberSequence.school_id == school_id,
            NumberSequence.year == year,
        ).with_for_update().first()
    seq.last_number += 1
    db.flush()
    return f"{prefix}-{year}-{seq.last_number:05d}"


def get_accounts(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(Account).filter(Account.school_id == school_id, Account.is_active == True)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(Account.created_at.desc()).all()


def create_account(db: Session, school_id: str, data, user_id: str):
    normal = ACCOUNT_TYPE_MAP.get(data.account_type.lower())
    if not normal:
        raise BadRequestException(f"Invalid account type: {data.account_type}")
    acct = Account(
        account_number=data.account_number, name=data.name,
        account_type=data.account_type.lower(), normal_side=normal,
        parent_id=data.parent_id, school_id=school_id, description=data.description,
    )
    db.add(acct)
    log_audit(db, user_id, "ACCOUNT_CREATED", "account", acct.id, f"Account '{data.name}' ({data.account_number}) created", school_id=school_id)
    db.commit()
    db.refresh(acct)
    return acct


def update_account(db: Session, account_id: str, data, user_id: str, school_id: str):
    acct = db.query(Account).filter(Account.id == account_id, Account.school_id == school_id).first()
    if not acct:
        raise NotFoundException("Account not found")
    if data.name is not None:
        acct.name = data.name
    if data.is_active is not None:
        acct.is_active = data.is_active
    if data.description is not None:
        acct.description = data.description
    log_audit(db, user_id, "ACCOUNT_UPDATED", "account", account_id, f"Account '{acct.account_number}' updated", school_id=school_id)
    db.commit()
    db.refresh(acct)
    return acct


def _check_period(db: Session, entry_date, school_id: str):
    period = db.query(AccountingPeriod).filter(
        AccountingPeriod.school_id == school_id,
        AccountingPeriod.start_date <= entry_date,
        AccountingPeriod.end_date >= entry_date,
        AccountingPeriod.is_locked == True,
    ).first()
    if period:
        raise BadRequestException(f"Period '{period.name}' is locked. No entries allowed.")


def _next_entry_number(db: Session, school_id: str) -> str:
    return _next_sequence_number(db, "JE", school_id)


def create_journal_entry(db: Session, school_id: str, data, user_id: str):
    _check_period(db, data.entry_date, school_id)
    if len(data.lines) < 2:
        raise BadRequestException("Journal entry must have at least 2 lines")
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    for line in data.lines:
        acct = db.query(Account).filter(Account.id == line.account_id, Account.school_id == school_id, Account.is_active == True).first()
        if not acct:
            raise BadRequestException(f"Account {line.account_id} not found or inactive")
        if line.debit > 0 and line.credit > 0:
            raise BadRequestException("Line cannot have both debit and credit")
        total_debit += Decimal(str(line.debit))
        total_credit += Decimal(str(line.credit))
    if abs(total_debit - total_credit) > Decimal("0.001"):
        raise BadRequestException(f"Debit ({total_debit}) must equal Credit ({total_credit})")
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
            school_id=school_id,
            debit=Decimal(str(line.debit)),
            credit=Decimal(str(line.credit)),
            description=line.description,
        )
        db.add(jl)
    log_audit(db, user_id, "JOURNAL_POSTED", "journal_entry", entry.id,
              f"Entry {entry.entry_number}: Debit {total_debit}, Credit {total_credit}", school_id=school_id)
    db.commit()
    db.refresh(entry)
    enqueue_sync(db, "journal_entries", entry.id, "CREATE",
                 {"entry_number": entry.entry_number, "school_id": school_id},
                 school_id)
    return entry


def reverse_journal_entry(db: Session, entry_id: str, reason: str, user_id: str, school_id: str):
    original = db.query(JournalEntry).filter(JournalEntry.id == entry_id, JournalEntry.school_id == school_id).first()
    if not original:
        raise NotFoundException("Journal entry not found")
    if original.is_reversed:
        raise BadRequestException("Entry already reversed")
    lines = db.query(JournalLine).filter(JournalLine.journal_entry_id == entry_id).all()
    reverse_lines = []
    for line in lines:
        reverse_lines.append(type("RL", (), {"account_id": line.account_id, "debit": float(line.credit), "credit": float(line.debit), "description": f"Reversal: {reason}"})())
    rev_data = type("RD", (), {"entry_date": datetime.now(timezone.utc).date(), "description": f"Reversal of {original.entry_number}: {reason}", "lines": reverse_lines})()
    rev_entry = create_journal_entry(db, original.school_id, rev_data, user_id)
    original.is_reversed = True
    original.reversed_entry_id = rev_entry.id
    log_audit(db, user_id, "JOURNAL_REVERSED", "journal_entry", entry_id, f"Reversed by {rev_entry.entry_number}: {reason}", school_id=school_id)
    db.commit()
    return original


def get_journal_entries(db: Session, school_id: str, limit: int = 50, include_deleted: bool = False, skip: int = 0):
    q = db.query(JournalEntry).filter(JournalEntry.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(JournalEntry.created_at.desc()).offset(skip).limit(limit).all()


def get_journal_lines(db: Session, entry_id: str, school_id: str, include_deleted: bool = False):
    q = db.query(JournalLine).join(JournalEntry).filter(
        JournalLine.journal_entry_id == entry_id,
        JournalEntry.school_id == school_id,
    )
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_fee_type(db: Session, school_id: str, data, user_id: str):
    ft = FeeType(name=data.name, frequency=data.frequency, school_id=school_id, account_id=data.account_id)
    db.add(ft)
    log_audit(db, user_id, "FEE_TYPE_CREATED", "fee_type", ft.id, f"Fee type '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(ft)
    return ft


def get_fee_types(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(FeeType).filter(FeeType.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(FeeType.created_at.desc()).limit(200).all()


def update_fee_type(db: Session, fee_type_id: str, data, user_id: str, school_id: str):
    ft = db.query(FeeType).filter(FeeType.id == fee_type_id, FeeType.school_id == school_id).first()
    if not ft:
        raise NotFoundException("Fee type not found")
    if data.name is not None:
        ft.name = data.name
    if data.frequency is not None:
        ft.frequency = data.frequency
    if data.account_id is not None:
        ft.account_id = data.account_id
    log_audit(db, user_id, "FEE_TYPE_UPDATED", "fee_type", ft.id, f"Fee type '{ft.name}' updated", school_id=school_id)
    db.commit()
    db.refresh(ft)
    return ft


def delete_fee_type(db: Session, fee_type_id: str, user_id: str, school_id: str):
    ft = db.query(FeeType).filter(FeeType.id == fee_type_id, FeeType.school_id == school_id).first()
    if not ft:
        raise NotFoundException("Fee type not found")
    ft.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "FEE_TYPE_DELETED", "fee_type", fee_type_id, "Fee type deleted", school_id=school_id)
    db.commit()


def create_fee_structure(db: Session, data, user_id: str, school_id: str):
    ft = db.query(FeeType).filter(FeeType.id == data.fee_type_id, FeeType.school_id == school_id).first()
    if not ft:
        raise NotFoundException("Fee type not found")
    fs = FeeStructure(fee_type_id=data.fee_type_id, school_id=school_id, class_id=data.class_id, amount=Decimal(str(data.amount)), due_date=data.due_date)
    db.add(fs)
    log_audit(db, user_id, "FEE_STRUCTURE_CREATED", "fee_structure", fs.id, "Fee structure created", school_id=school_id)
    db.commit()
    db.refresh(fs)
    return fs


def get_fee_structures(db: Session, school_id: str, fee_type_id: str = None, include_deleted: bool = False):
    q = db.query(FeeStructure).join(FeeType).filter(FeeType.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if fee_type_id:
        q = q.filter(FeeStructure.fee_type_id == fee_type_id)
    return q.all()


def assign_fee(db: Session, data, user_id: str, school_id: str):
    fs = db.query(FeeStructure).join(FeeType).filter(
        FeeStructure.id == data.fee_structure_id, FeeType.school_id == school_id
    ).first()
    if not fs:
        raise NotFoundException("Fee structure not found")
    fa = FeeAssignment(
        student_id=data.student_id, fee_structure_id=data.fee_structure_id,
        amount=Decimal(str(data.amount)), academic_year_id=data.academic_year_id,
        school_id=school_id, is_waived=data.is_waived,
    )
    db.add(fa)
    log_audit(db, user_id, "FEE_ASSIGNED", "fee_assignment", fa.id, f"Fee assigned to student {data.student_id}", school_id=school_id)
    db.commit()
    db.refresh(fa)
    return fa


def get_fee_assignments(db: Session, school_id: str, student_id: str = None, academic_year_id: str = None, include_deleted: bool = False):
    q = db.query(FeeAssignment).join(FeeStructure, FeeAssignment.fee_structure_id == FeeStructure.id).join(FeeType).filter(FeeType.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if student_id:
        q = q.filter(FeeAssignment.student_id == student_id)
    if academic_year_id:
        q = q.filter(FeeAssignment.academic_year_id == academic_year_id)
    return q.all()


def _next_invoice_number(db: Session, school_id: str) -> str:
    return _next_sequence_number(db, "INV", school_id)


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
            invoice_id=invoice.id, school_id=school_id,
            fee_assignment_id=line.get("fee_assignment_id"),
            description=line["description"], amount=Decimal(str(line["amount"])),
        )
        db.add(il)
    log_audit(db, user_id, "INVOICE_CREATED", "invoice", invoice.id, f"Invoice {invoice.invoice_number} created for student {data.student_id}", school_id=school_id)
    db.commit()
    db.refresh(invoice)

    from app.services.communication_service import send_notification
    from app.models.parent_student_link import ParentStudentLink
    from app.models.parent import Parent
    from app.models.student import Student
    student = db.query(Student).filter(Student.id == data.student_id, Student.school_id == school_id).first()
    if not student:
        raise NotFoundException("Student not found")
    links = db.query(ParentStudentLink).filter(
        ParentStudentLink.student_id == data.student_id,
        ParentStudentLink.school_id == school_id,
    ).all()
    for link in links:
        parent = db.query(Parent).filter(Parent.id == link.parent_id, Parent.user_id != None).first()
        if parent:
            send_notification(
                db, parent.user_id,
                f"Invoice {invoice.invoice_number}",
                f"A new invoice of ${total} is due on {data.due_date}.",
                notification_type="invoice_created",
                reference_type="invoice", reference_id=str(invoice.id),
            )

    return invoice


def get_invoices(db: Session, school_id: str, student_id: str = None, status: str = None, include_deleted: bool = False, skip: int = 0, limit: int = 50):
    q = db.query(Invoice).filter(Invoice.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if student_id:
        q = q.filter(Invoice.student_id == student_id)
    if status:
        q = q.filter(Invoice.status == status)
    return q.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()


def get_invoice_aging(db: Session, school_id: str) -> dict:
    from datetime import date
    from sqlalchemy import text

    today = date.today()
    q = db.query(Invoice).filter(Invoice.school_id == school_id, Invoice.status.in_(["pending", "partial"]))
    buckets = {"current": 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0}
    total_overdue = 0
    for inv in q.all():
        if not inv.due_date:
            buckets["current"] += 1
            continue
        days = (today - inv.due_date).days
        if days <= 0:
            buckets["current"] += 1
        elif days <= 30:
            buckets["1_30"] += 1
            total_overdue += inv.total_amount - (inv.paid_amount or 0)
        elif days <= 60:
            buckets["31_60"] += 1
            total_overdue += inv.total_amount - (inv.paid_amount or 0)
        elif days <= 90:
            buckets["61_90"] += 1
            total_overdue += inv.total_amount - (inv.paid_amount or 0)
        else:
            buckets["90_plus"] += 1
            total_overdue += inv.total_amount - (inv.paid_amount or 0)
    return {"buckets": buckets, "total_overdue": float(total_overdue)}


def _next_payment_number(db: Session, school_id: str) -> str:
    return _next_sequence_number(db, "PAY", school_id)


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
        inv = db.query(Invoice).filter(Invoice.id == data.invoice_id, Invoice.school_id == school_id).with_for_update().first()
        if inv:
            total_paid = Decimal(str(inv.paid_amount)) + Decimal(str(data.amount))
            if total_paid > inv.total_amount:
                raise BadRequestException(f"Payment would exceed invoice balance ({inv.total_amount})")
            inv.paid_amount = total_paid
            if inv.paid_amount >= inv.total_amount:
                inv.status = "paid"
            elif inv.paid_amount > 0:
                inv.status = "partial"
    db.flush()
    je = _create_payment_journal_entry(db, school_id, payment, user_id)
    payment.journal_entry_id = je.id
    log_audit(db, user_id, "PAYMENT_RECEIVED", "payment", payment.id,
              f"Payment {payment.payment_number}: {data.amount} via {data.payment_method}", school_id=school_id)
    db.commit()
    db.refresh(payment)
    enqueue_sync(db, "payments", payment.id, "CREATE",
                 {"payment_number": payment.payment_number, "amount": str(payment.amount),
                  "method": payment.payment_method, "school_id": school_id},
                 school_id)
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
    db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, school_id=school_id, debit=amt, credit=0,
                       description=payment.payment_number))
    db.add(JournalLine(journal_entry_id=entry.id, account_id=receivable_acct.id, school_id=school_id, debit=0, credit=amt,
                       description=payment.payment_number))
    return entry


def get_payments(db: Session, school_id: str, invoice_id: str = None, student_id: str = None, include_deleted: bool = False, skip: int = 0, limit: int = 50):
    q = db.query(Payment).filter(Payment.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if invoice_id:
        q = q.filter(Payment.invoice_id == invoice_id)
    if student_id:
        q = q.filter(Payment.student_id == student_id)
    return q.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()


def get_wallet(db: Session, student_id: str, school_id: str) -> Wallet:
    w = db.query(Wallet).filter(Wallet.student_id == student_id, Wallet.school_id == school_id).first()
    if not w:
        w = Wallet(student_id=student_id, balance=Decimal("0.00"))
        db.add(w)
        db.commit()
        db.refresh(w)
    return w


def wallet_transaction(db: Session, student_id: str, school_id: str, data, user_id: str) -> WalletTransaction:
    # Concurrency safety: lock the wallet row for the duration of this transaction
    # so two concurrent payments cannot both read the same balance and overspend.
    w = db.query(Wallet).filter(
        Wallet.student_id == student_id, Wallet.school_id == school_id,
    ).with_for_update().first()
    if not w:
        # Lazily create the wallet (mirrors get_wallet) but now within the locked scope.
        w = Wallet(student_id=student_id, balance=Decimal("0.00"), school_id=school_id)
        db.add(w)
        db.flush()
        w = db.query(Wallet).filter(
            Wallet.student_id == student_id, Wallet.school_id == school_id,
        ).with_for_update().first()
    bal = Decimal(str(w.balance))
    amt = Decimal(str(data.amount))
    if data.transaction_type in ("payment", "withdrawal") and bal < amt:
        raise BadRequestException("Insufficient wallet balance")
    delta = amt if data.transaction_type in ("top_up", "refund") else -amt
    new_bal = bal + delta
    wt = WalletTransaction(
        wallet_id=w.id, transaction_type=data.transaction_type,
        amount=amt, balance_before=bal, balance_after=new_bal,
        reference=data.reference, school_id=school_id,
    )
    w.balance = new_bal
    db.add(wt)
    db.flush()
    _check_period(db, datetime.now(timezone.utc).date(), school_id)
    je = _create_wallet_journal_entry(db, w, wt, user_id)
    wt.journal_entry_id = je.id
    log_audit(db, user_id, "WALLET_TRANSACTION", "wallet_transaction", wt.id,
              f"Wallet {data.transaction_type}: {data.amount}", school_id=school_id)
    db.commit()
    db.refresh(wt)
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
        db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, school_id=school_id, debit=amt, credit=0,
                           description=f"Wallet {wt.transaction_type}"))
        db.add(JournalLine(journal_entry_id=entry.id, account_id=deposit_acct.id, school_id=school_id, debit=0, credit=amt,
                           description=f"Wallet {wt.transaction_type}"))
    else:
        db.add(JournalLine(journal_entry_id=entry.id, account_id=deposit_acct.id, school_id=school_id, debit=amt, credit=0,
                           description=f"Wallet {wt.transaction_type}"))
        db.add(JournalLine(journal_entry_id=entry.id, account_id=cash_acct.id, school_id=school_id, debit=0, credit=amt,
                           description=f"Wallet {wt.transaction_type}"))
    return entry


def get_wallet_transactions(db: Session, wallet_id: str, school_id: str, include_deleted: bool = False):
    q = db.query(WalletTransaction).filter(WalletTransaction.wallet_id == wallet_id, WalletTransaction.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(WalletTransaction.created_at.desc()).all()


def create_scholarship(db: Session, data, user_id: str, school_id: str, approved_by: str = None):
    s = Scholarship(
        student_id=data.student_id, scholarship_type=data.scholarship_type,
        value=Decimal(str(data.value)), academic_year_id=data.academic_year_id,
        school_id=school_id, approved_by=approved_by,
    )
    db.add(s)
    log_audit(db, user_id, "SCHOLARSHIP_CREATED", "scholarship", s.id, f"Scholarship for student {data.student_id}", school_id=school_id)
    db.commit()
    db.refresh(s)
    return s


def get_scholarships(db: Session, school_id: str, student_id: str = None, academic_year_id: str = None, include_deleted: bool = False):
    q = db.query(Scholarship).filter(Scholarship.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if student_id:
        q = q.filter(Scholarship.student_id == student_id)
    if academic_year_id:
        q = q.filter(Scholarship.academic_year_id == academic_year_id)
    return q.all()


def create_period(db: Session, school_id: str, data, user_id: str):
    p = AccountingPeriod(name=data.name, start_date=data.start_date, end_date=data.end_date, school_id=school_id)
    db.add(p)
    log_audit(db, user_id, "PERIOD_CREATED", "accounting_period", p.id, f"Period '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(p)
    return p


def lock_period(db: Session, period_id: str, user_id: str, school_id: str):
    p = db.query(AccountingPeriod).filter(AccountingPeriod.id == period_id, AccountingPeriod.school_id == school_id).first()
    if not p:
        raise NotFoundException("Period not found")
    p.is_locked = True
    p.locked_by = user_id
    p.locked_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "PERIOD_LOCKED", "accounting_period", period_id, "Period locked", school_id=school_id)
    db.commit()
    return p


def unlock_period(db: Session, period_id: str, user_id: str, reason: str, school_id: str = None):
    # Tenant isolation: scope by school_id when provided so an admin of school A
    # cannot unlock an accounting period belonging to school B.
    q = db.query(AccountingPeriod).filter(AccountingPeriod.id == period_id)
    if school_id:
        q = q.filter(AccountingPeriod.school_id == school_id)
    p = q.first()
    if not p:
        raise NotFoundException("Period not found")
    p.is_locked = False
    p.locked_by = None
    p.locked_at = None
    log_audit(db, user_id, "PERIOD_UNLOCKED", "accounting_period", period_id, f"Unlocked: {reason}", school_id=school_id)
    db.commit()
    return p


def get_periods(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(AccountingPeriod).filter(AccountingPeriod.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(AccountingPeriod.start_date.desc()).all()


def create_payroll_run(db: Session, school_id: str, data, user_id: str):
    pr = PayrollRun(name=data.name, period_start=data.period_start, period_end=data.period_end, school_id=school_id, created_by=user_id)
    db.add(pr)
    log_audit(db, user_id, "PAYROLL_CREATED", "payroll_run", pr.id, f"Payroll '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(pr)
    return pr


def get_payroll_runs(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(PayrollRun).filter(PayrollRun.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(PayrollRun.created_at.desc()).all()


def approve_payroll(db: Session, run_id: str, user_id: str, school_id: str):
    pr = db.query(PayrollRun).filter(PayrollRun.id == run_id, PayrollRun.school_id == school_id).first()
    if not pr:
        raise NotFoundException("Payroll run not found")
    pr.status = "approved"
    pr.approved_by = user_id
    log_audit(db, user_id, "PAYROLL_APPROVED", "payroll_run", run_id, "Payroll approved", school_id=school_id)
    db.commit()
    return pr


def create_budget(db: Session, school_id: str, data, user_id: str):
    b = Budget(name=data.name, academic_year_id=data.academic_year_id, school_id=school_id, created_by=user_id)
    db.add(b)
    log_audit(db, user_id, "BUDGET_CREATED", "budget", b.id, f"Budget '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(b)
    return b


def get_budgets(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(Budget).filter(Budget.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_budget_item(db: Session, budget_id: str, data, user_id: str, school_id: str):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.school_id == school_id).first()
    if not budget:
        raise NotFoundException("Budget not found")
    bi = BudgetItem(budget_id=budget_id, school_id=school_id, account_id=data.account_id, description=data.description, planned_amount=Decimal(str(data.planned_amount)))
    db.add(bi)
    budget.total_amount = Decimal(str(budget.total_amount)) + Decimal(str(data.planned_amount))
    log_audit(db, user_id, "BUDGET_ITEM_CREATED", "budget_item", bi.id, "Budget item created", school_id=school_id)
    db.commit()
    db.refresh(bi)
    return bi


def get_budget_items(db: Session, budget_id: str, school_id: str, include_deleted: bool = False):
    q = db.query(BudgetItem).join(Budget).filter(
        BudgetItem.budget_id == budget_id, Budget.school_id == school_id
    )
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_purchase_request(db: Session, school_id: str, data, user_id: str):
    pr = PurchaseRequest(
        pr_number=_next_sequence_number(db, "PR", school_id),
        requested_by=user_id, department=data.department,
        description=data.description, estimated_amount=Decimal(str(data.estimated_amount)) if data.estimated_amount else None,
        school_id=school_id,
    )
    db.add(pr)
    log_audit(db, user_id, "PURCHASE_REQUEST_CREATED", "purchase_request", pr.id, f"PR {pr.pr_number} created", school_id=school_id)
    db.commit()
    db.refresh(pr)
    return pr


def get_purchase_requests(db: Session, school_id: str, include_deleted: bool = False, skip: int = 0, limit: int = 200):
    q = db.query(PurchaseRequest).filter(PurchaseRequest.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(PurchaseRequest.created_at.desc()).offset(skip).limit(limit).all()


def approve_purchase_request(db: Session, pr_id: str, user_id: str, school_id: str):
    pr = db.query(PurchaseRequest).filter(PurchaseRequest.id == pr_id, PurchaseRequest.school_id == school_id).first()
    if not pr:
        raise NotFoundException("Purchase request not found")
    pr.status = "approved"
    pr.approved_by = user_id
    log_audit(db, user_id, "PURCHASE_REQUEST_APPROVED", "purchase_request", pr_id, "PR approved", school_id=school_id)
    db.commit()
    return pr


def create_purchase_order(db: Session, school_id: str, data, user_id: str):
    po = PurchaseOrder(
        po_number=_next_sequence_number(db, "PO", school_id),
        purchase_request_id=data.purchase_request_id, supplier=data.supplier,
        total_amount=Decimal(str(data.total_amount)) if data.total_amount else None,
        school_id=school_id, created_by=user_id,
    )
    db.add(po)
    log_audit(db, user_id, "PURCHASE_ORDER_CREATED", "purchase_order", po.id, f"PO {po.po_number} created", school_id=school_id)
    db.commit()
    db.refresh(po)
    return po


def get_purchase_orders(db: Session, school_id: str, include_deleted: bool = False, skip: int = 0, limit: int = 200):
    q = db.query(PurchaseOrder).filter(PurchaseOrder.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.order_by(PurchaseOrder.created_at.desc()).offset(skip).limit(limit).all()


def trial_balance(db: Session, school_id: str):
    accounts = db.query(Account).filter(Account.school_id == school_id, Account.is_active == True).all()
    account_ids = [a.id for a in accounts]
    if not account_ids:
        return {"rows": [], "total_debit": 0.0, "total_credit": 0.0}
    all_lines = db.query(JournalLine).filter(
        JournalLine.account_id.in_(account_ids),
        JournalLine.school_id == school_id,
    ).all()
    lines_by_account: dict[str, list[JournalLine]] = {}
    for line in all_lines:
        lines_by_account.setdefault(line.account_id, []).append(line)
    rows = []
    for acct in accounts:
        lines = lines_by_account.get(acct.id, [])
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
