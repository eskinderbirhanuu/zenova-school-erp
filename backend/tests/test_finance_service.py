"""Tests for finance service — accounts, journal, fees, invoices, payments, wallet, periods."""
from unittest.mock import MagicMock, patch, ANY
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from app.services import finance_service
from app.core.exceptions import BadRequestException, NotFoundException


class MockAccountData:
    def __init__(self, account_type="asset", account_number="1001", name="Cash",
                 parent_id=None, description=None):
        self.account_type = account_type
        self.account_number = account_number
        self.name = name
        self.parent_id = parent_id
        self.description = description


class MockAccountUpdate:
    def __init__(self, name=None, is_active=None, description=None):
        self.name = name
        self.is_active = is_active
        self.description = description


class MockJournalLine:
    def __init__(self, account_id="acct-1", debit=100, credit=0, description="test"):
        self.account_id = account_id
        self.debit = debit
        self.credit = credit
        self.description = description


class MockJournalData:
    def __init__(self, entry_date=None, description="test entry", lines=None):
        self.entry_date = entry_date or date(2026, 7, 16)
        self.description = description
        self.lines = lines or [MockJournalLine(), MockJournalLine(debit=0, credit=100)]


class MockFeeTypeData:
    def __init__(self, name="Tuition", frequency="monthly", account_id="acct-1"):
        self.name = name
        self.frequency = frequency
        self.account_id = account_id


class MockFeeTypeUpdate:
    def __init__(self, name=None, frequency=None, account_id=None):
        self.name = name
        self.frequency = frequency
        self.account_id = account_id


class MockFeeStructureData:
    def __init__(self, fee_type_id="ft-1", class_id="class-1", amount=500, due_date=None):
        self.fee_type_id = fee_type_id
        self.class_id = class_id
        self.amount = amount
        self.due_date = due_date or date(2026, 8, 15)


class MockAssignFeeData:
    def __init__(self, fee_structure_id="fs-1", student_id="stu-1",
                 amount=500, academic_year_id="ay-1", is_waived=False):
        self.fee_structure_id = fee_structure_id
        self.student_id = student_id
        self.amount = amount
        self.academic_year_id = academic_year_id
        self.is_waived = is_waived


class MockInvoiceLine:
    def __init__(self, description="Tuition", amount=500, fee_assignment_id=None):
        self.description = description
        self.amount = amount
        self.get = lambda k, d=None: {"fee_assignment_id": fee_assignment_id}.get(k, d)


class MockInvoiceData:
    def __init__(self, student_id="stu-1", due_date=None, academic_year_id="ay-1", lines=None):
        self.student_id = student_id
        self.due_date = due_date or date(2026, 8, 15)
        self.academic_year_id = academic_year_id
        self.lines = lines or [{"description": "Tuition", "amount": 500}]


class MockPaymentData:
    def __init__(self, invoice_id="inv-1", student_id="stu-1", amount=100,
                 payment_method="cash", reference=None, payment_date=None,
                 idempotency_key=None):
        self.invoice_id = invoice_id
        self.student_id = student_id
        self.amount = amount
        self.payment_method = payment_method
        self.reference = reference
        self.payment_date = payment_date or date(2026, 7, 16)
        self.idempotency_key = idempotency_key


class MockWalletData:
    def __init__(self, amount=100, transaction_type="top_up", reference="ref-1"):
        self.amount = amount
        self.transaction_type = transaction_type
        self.reference = reference


class MockPeriodData:
    def __init__(self, name="2026 Q3", start_date=None, end_date=None):
        self.name = name
        self.start_date = start_date or date(2026, 7, 1)
        self.end_date = end_date or date(2026, 9, 30)


# ── Accounts ──────────────────────────────────────────────

class TestGetAccounts:
    def test_returns_list(self):
        db = MagicMock()
        expected = [MagicMock(), MagicMock()]
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = expected
        result = finance_service.get_accounts(db, "school-1")
        assert len(result) == 2

    def test_empty(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        result = finance_service.get_accounts(db, "school-1")
        assert result == []


class TestCreateAccount:
    def test_creates_debit_account(self):
        db = MagicMock()
        data = MockAccountData(account_type="asset")
        result = finance_service.create_account(db, "school-1", data, "user-1")
        assert result.normal_side == "debit"
        assert db.add.called

    def test_creates_credit_account(self):
        db = MagicMock()
        data = MockAccountData(account_type="revenue")
        result = finance_service.create_account(db, "school-1", data, "user-1")
        assert result.normal_side == "credit"

    def test_invalid_type_raises(self):
        db = MagicMock()
        data = MockAccountData(account_type="invalid")
        with pytest.raises(BadRequestException, match="Invalid account type"):
            finance_service.create_account(db, "school-1", data, "user-1")


class TestUpdateAccount:
    def test_updates_name(self):
        db = MagicMock()
        account = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = account
        data = MockAccountUpdate(name="New Name")
        result = finance_service.update_account(db, "acct-1", data, "user-1", "school-1")
        assert account.name == "New Name"

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockAccountUpdate(name="X")
        with pytest.raises(NotFoundException, match="Account not found"):
            finance_service.update_account(db, "acct-nonexistent", data, "user-1", "school-1")

    def test_partial_update(self):
        db = MagicMock()
        account = MagicMock()
        account.name = "Original"
        account.is_active = True
        db.query.return_value.filter.return_value.first.return_value = account
        data = MockAccountUpdate(name="Updated", is_active=False)
        result = finance_service.update_account(db, "acct-1", data, "user-1", "school-1")
        assert account.name == "Updated"
        assert account.is_active is False


# ── Journal ───────────────────────────────────────────────

class TestCreateJournalEntry:
    def test_creates_valid_entry(self, patch_audit):
        db = MagicMock()
        active = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # _check_period: no locked period
            active,  # account 1 active
            active,  # account 2 active
        ]
        data = MockJournalData()
        with patch("app.services.finance_service.enqueue_sync"), \
             patch("app.services.finance_service._next_sequence_number", return_value="JE-2026-00001"):
            result = finance_service.create_journal_entry(db, "school-1", data, "user-1")
            assert result is not None
            assert db.add.called

    def test_locked_period_raises(self):
        db = MagicMock()
        locked_period = MagicMock()
        locked_period.name = "Locked Q3"
        db.query.return_value.filter.return_value.first.return_value = locked_period
        data = MockJournalData()
        with pytest.raises(BadRequestException, match="locked"):
            finance_service.create_journal_entry(db, "school-1", data, "user-1")

    def test_too_few_lines_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None  # period check passes
        data = MockJournalData(lines=[MockJournalLine()])
        with patch("app.services.finance_service._next_sequence_number"):
            with pytest.raises(BadRequestException, match="at least 2 lines"):
                finance_service.create_journal_entry(db, "school-1", data, "user-1")

    def test_inactive_account_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # period check passes
            None,  # account 1 not found
        ]
        data = MockJournalData()
        with patch("app.services.finance_service._next_sequence_number"):
            with pytest.raises(BadRequestException, match="not found or inactive"):
                finance_service.create_journal_entry(db, "school-1", data, "user-1")

    def test_unbalanced_raises(self):
        db = MagicMock()
        active = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # period check passes
            active,  # account 1 active
            active,  # account 2 active
        ]
        data = MockJournalData(lines=[
            MockJournalLine(debit=100, credit=0),
            MockJournalLine(debit=0, credit=50),  # unbalanced: 100 vs 50
        ])
        with patch("app.services.finance_service._next_sequence_number"):
            with pytest.raises(BadRequestException, match="must equal Credit"):
                finance_service.create_journal_entry(db, "school-1", data, "user-1")


class TestReverseJournalEntry:
    def test_reverses_entry(self, patch_audit):
        db = MagicMock()
        original = MagicMock()
        original.is_reversed = False
        original.school_id = "school-1"
        original.entry_number = "JE-001"
        active = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [
            original,  # journal entry lookup
            None,  # _check_period: no locked period
            active,  # account 1 active
            active,  # account 2 active
        ]
        line1 = MagicMock()
        line1.account_id = "acct-1"
        line1.debit = 100
        line1.credit = 0
        line2 = MagicMock()
        line2.account_id = "acct-2"
        line2.debit = 0
        line2.credit = 100
        db.query.return_value.filter.return_value.all.return_value = [line1, line2]

        with patch("app.services.finance_service._next_sequence_number", return_value="JE-2026-00002"):
            result = finance_service.reverse_journal_entry(db, "entry-1", "error", "user-1", "school-1")
            assert result.is_reversed is True

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Journal entry not found"):
            finance_service.reverse_journal_entry(db, "entry-nonexistent", "reason", "user-1", "school-1")

    def test_already_reversed_raises(self):
        db = MagicMock()
        original = MagicMock()
        original.is_reversed = True
        db.query.return_value.filter.return_value.first.return_value = original
        with pytest.raises(BadRequestException, match="already reversed"):
            finance_service.reverse_journal_entry(db, "entry-1", "reason", "user-1", "school-1")


# ── Fee Types ─────────────────────────────────────────────

class TestCreateFeeType:
    def test_creates_fee_type(self):
        db = MagicMock()
        data = MockFeeTypeData()
        result = finance_service.create_fee_type(db, "school-1", data, "user-1")
        assert result.name == "Tuition"
        assert result.frequency == "monthly"


class TestUpdateFeeType:
    def test_updates_name(self):
        db = MagicMock()
        ft = MagicMock()
        ft.name = "Old"
        db.query.return_value.filter.return_value.first.return_value = ft
        data = MockFeeTypeUpdate(name="New")
        result = finance_service.update_fee_type(db, "ft-1", data, "user-1", "school-1")
        assert ft.name == "New"

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockFeeTypeUpdate(name="X")
        with pytest.raises(NotFoundException, match="Fee type not found"):
            finance_service.update_fee_type(db, "ft-nonexistent", data, "user-1", "school-1")


class TestDeleteFeeType:
    def test_soft_deletes(self):
        db = MagicMock()
        ft = MagicMock()
        ft.deleted_at = None
        db.query.return_value.filter.return_value.first.return_value = ft
        finance_service.delete_fee_type(db, "ft-1", "user-1", "school-1")
        assert ft.deleted_at is not None
        assert db.commit.called

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Fee type not found"):
            finance_service.delete_fee_type(db, "ft-nonexistent", "user-1", "school-1")


# ── Fee Structures ────────────────────────────────────────

class TestCreateFeeStructure:
    def test_creates_structure(self):
        db = MagicMock()
        ft = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = ft
        data = MockFeeStructureData()
        result = finance_service.create_fee_structure(db, data, "user-1", "school-1")
        assert result is not None

    def test_fee_type_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockFeeStructureData()
        with pytest.raises(NotFoundException, match="Fee type not found"):
            finance_service.create_fee_structure(db, data, "user-1", "school-1")


class TestAssignFee:
    def test_assigns_fee(self):
        db = MagicMock()
        fs = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.first.return_value = fs
        data = MockAssignFeeData()
        result = finance_service.assign_fee(db, data, "user-1", "school-1")
        assert result is not None

    def test_structure_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.first.return_value = None
        data = MockAssignFeeData()
        with pytest.raises(NotFoundException, match="Fee structure not found"):
            finance_service.assign_fee(db, data, "user-1", "school-1")


# ── Invoices ──────────────────────────────────────────────

class TestCreateInvoice:
    def test_creates_invoice(self, patch_audit):
        db = MagicMock()
        student = MagicMock()
        student.id = "stu-1"
        db.query.return_value.filter.return_value.first.return_value = student
        data = MockInvoiceData()
        with patch("app.services.finance_service.enqueue_sync"), \
             patch("app.services.communication_service.send_notification"), \
             patch("app.services.finance_service._next_sequence_number", return_value="INV-2026-00001"):
            result = finance_service.create_invoice(db, "school-1", data, "user-1")
            assert result is not None
            assert db.add.called

    def test_student_not_found_raises(self, patch_audit):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockInvoiceData()
        with patch("app.services.finance_service.enqueue_sync"), \
             patch("app.services.finance_service._next_sequence_number", return_value="INV-2026-00001"):
            with pytest.raises(NotFoundException, match="Student not found"):
                finance_service.create_invoice(db, "school-1", data, "user-1")


# ── Record Payment ────────────────────────────────────────

class TestRecordPayment:
    def test_records_payment(self, patch_audit):
        db = MagicMock()
        invoice = MagicMock()
        invoice.paid_amount = Decimal("0")
        invoice.total_amount = Decimal("500")
        cash_acct = MagicMock()
        cash_acct.id = "cash-1"
        receivable_acct = MagicMock()
        receivable_acct.id = "recv-1"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = invoice
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # _check_period: no locked period
            cash_acct,  # Cash on Hand
            receivable_acct,  # Student Fees Receivable
        ]
        data = MockPaymentData()
        with patch("app.services.finance_service.enqueue_sync"), \
             patch("app.services.finance_service._next_sequence_number", return_value="PAY-2026-00001"):
            result = finance_service.record_payment(db, "school-1", data, "user-1")
            assert result is not None
            assert invoice.paid_amount == Decimal("100")

    def test_exceeds_invoice_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        invoice = MagicMock()
        invoice.paid_amount = Decimal("480")
        invoice.total_amount = Decimal("500")
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = invoice
        data = MockPaymentData(amount=50)
        with patch("app.services.finance_service._next_sequence_number"):
            with pytest.raises(BadRequestException, match="exceed invoice balance"):
                finance_service.record_payment(db, "school-1", data, "user-1")


# ── Wallet ────────────────────────────────────────────────

class TestGetWallet:
    def test_creates_if_not_exists(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = finance_service.get_wallet(db, "stu-1", "school-1")
        assert result.balance == Decimal("0.00")
        assert db.add.called

    def test_returns_existing(self):
        db = MagicMock()
        wallet = MagicMock()
        wallet.balance = Decimal("200")
        db.query.return_value.filter.return_value.first.return_value = wallet
        result = finance_service.get_wallet(db, "stu-1", "school-1")
        assert result.balance == Decimal("200")


class TestWalletTransaction:
    def test_top_up_increases_balance(self, patch_audit):
        db = MagicMock()
        wallet = MagicMock()
        wallet.balance = Decimal("100")
        wallet.id = "wallet-1"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = wallet
        student = MagicMock()
        student.school_id = "school-1"
        cash_acct = MagicMock()
        cash_acct.id = "cash-1"
        deposit_acct = MagicMock()
        deposit_acct.id = "dep-1"
        db.query.return_value.filter.return_value.first.side_effect = [
            None,  # _check_period: no locked period
            student,  # student lookup
            cash_acct,  # Cash on Hand
            deposit_acct,  # Customer Deposits
        ]
        data = MockWalletData(transaction_type="top_up", amount=50)
        with patch("app.services.finance_service._next_sequence_number", return_value="JE-2026-00001"):
            result = finance_service.wallet_transaction(db, "stu-1", "school-1", data, "user-1")
            assert result.transaction_type == "top_up"
            assert result.amount == Decimal("50")

    def test_insufficient_balance_raises(self):
        db = MagicMock()
        wallet = MagicMock()
        wallet.balance = Decimal("10")
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = wallet
        data = MockWalletData(transaction_type="payment", amount=50)
        with pytest.raises(BadRequestException, match="Insufficient wallet balance"):
            finance_service.wallet_transaction(db, "stu-1", "school-1", data, "user-1")


# ── Periods ───────────────────────────────────────────────

class TestLockPeriod:
    def test_locks_period(self):
        db = MagicMock()
        period = MagicMock()
        period.is_locked = False
        db.query.return_value.filter.return_value.first.return_value = period
        result = finance_service.lock_period(db, "period-1", "user-1", "school-1")
        assert period.is_locked is True

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Period not found"):
            finance_service.lock_period(db, "period-nonexistent", "user-1", "school-1")


class TestUnlockPeriod:
    def test_unlocks_period(self):
        db = MagicMock()
        period = MagicMock()
        period.is_locked = True
        db.query.return_value.filter.return_value.first.return_value = period
        result = finance_service.unlock_period(db, "period-1", "user-1", "corrected")
        assert period.is_locked is False

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Period not found"):
            finance_service.unlock_period(db, "period-nonexistent", "user-1", "reason")
