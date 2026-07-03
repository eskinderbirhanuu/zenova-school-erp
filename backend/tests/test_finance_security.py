from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, PropertyMock, patch
import pytest
from fastapi import HTTPException


def _make_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 0
    db.query.return_value.filter.return_value.order_by.return_value.count.return_value = 0
    return db


def _make_invoice(paid=Decimal("0"), total=Decimal("100")):
    inv = MagicMock()
    inv.paid_amount = paid
    inv.total_amount = total
    inv.status = "pending"
    return inv


class TestFix1_AuditParams:
    def test_log_audit_signature_matches_callers(self):
        import inspect
        from app.core.audit import log_audit
        sig = inspect.signature(log_audit)
        params = list(sig.parameters.keys())
        assert params[0] == "db"
        assert params[1] == "user_id"
        assert params[2] == "action"
        assert params[3] == "table_name"


class TestFix2_AutoPostGL:
    @patch("app.services.finance_service._next_entry_number", return_value="JE-2026-00001")
    def test_creates_journal_entry_with_two_lines(self, mock_nen):
        db = _make_db()
        payment = MagicMock()
        payment.payment_date = date(2026, 6, 25)
        payment.payment_number = "PAY-2026-00001"
        payment.payment_method = "cash"
        payment.amount = Decimal("100.00")
        from app.services.finance_service import _create_payment_journal_entry
        entry = _create_payment_journal_entry(db, "school-1", payment, "user-1")
        journal_lines = [c for c in db.add.call_args_list if "JournalLine" in str(c)]
        assert entry is not None
        assert len(journal_lines) >= 2

    @patch("app.services.finance_service._next_entry_number", return_value="JE-2026-00001")
    def test_creates_accounts_if_missing(self, mock_nen):
        db = _make_db()
        db.query.return_value.filter.return_value.first.return_value = None
        payment = MagicMock()
        payment.payment_date = date(2026, 6, 25)
        payment.payment_number = "PAY-2026-00002"
        payment.payment_method = "cash"
        payment.amount = Decimal("50.00")
        from app.services.finance_service import _create_payment_journal_entry
        _create_payment_journal_entry(db, "school-1", payment, "user-1")
        account_adds = [c for c in db.add.call_args_list if "Account" in str(c)]
        assert len(account_adds) >= 2


class TestFix3_IdempotencyKey:
    def test_returns_existing_payment_for_duplicate_key(self):
        db = _make_db()
        existing = MagicMock()
        existing.id = "pay-dup-1"
        db.query.return_value.filter.return_value.first.side_effect = [None, existing]
        from app.services.finance_service import record_payment
        data = MagicMock()
        data.idempotency_key = "dup-key-001"
        data.payment_date = date(2026, 6, 25)
        data.amount = 100
        data.invoice_id = None
        data.student_id = None
        data.payment_method = "cash"
        data.reference = None
        result = record_payment(db, "school-1", data, "user-1")
        assert result.id == "pay-dup-1"

    @patch("app.services.finance_service._next_payment_number", return_value="PAY-2026-00001")
    def test_proceeds_for_new_key(self, mock_npn):
        db = _make_db()
        db.query.return_value.filter.return_value.first.side_effect = [None, None]
        with patch("app.services.finance_service._create_payment_journal_entry") as mock_je:
            mock_je.return_value = MagicMock(id="je-1")
            from app.services.finance_service import record_payment
            data = MagicMock()
            data.idempotency_key = "new-key-001"
            data.payment_date = date(2026, 6, 25)
            data.invoice_id = None
            data.student_id = None
            data.amount = 100
            data.payment_method = "cash"
            data.reference = None
            result = record_payment(db, "school-1", data, "user-1")
            assert result is not None


class TestFix4_ConcurrencyLock:
    @patch("app.services.finance_service._next_payment_number", return_value="PAY-2026-00001")
    def test_with_for_update_called_on_invoice(self, mock_npn):
        db = _make_db()
        db.query.return_value.filter.return_value.first.return_value = None
        mock_fu = MagicMock()
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_fu
        mock_fu.first.return_value = None
        with patch("app.services.finance_service._create_payment_journal_entry") as mock_je:
            mock_je.return_value = MagicMock(id="je-2")
            from app.services.finance_service import record_payment
            data = MagicMock()
            data.idempotency_key = None
            data.payment_date = date(2026, 6, 25)
            data.invoice_id = "inv-1"
            data.student_id = None
            data.amount = 100
            data.payment_method = "cash"
            data.reference = None
            from app.models.invoice import Invoice
            record_payment(db, "school-1", data, "user-1")
            db.query.return_value.filter.return_value.with_for_update.assert_called_once()


class TestFix6_OverPayment:
    @patch("app.services.finance_service._next_payment_number", return_value="PAY-2026-00001")
    def test_rejects_payment_exceeding_invoice(self, mock_npn):
        db = _make_db()
        inv = _make_invoice(paid=Decimal("90"), total=Decimal("100"))
        db.query.return_value.filter.return_value.first.side_effect = [None, inv]
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = inv
        from app.services.finance_service import record_payment
        data = MagicMock()
        data.idempotency_key = None
        data.payment_date = date(2026, 6, 25)
        data.invoice_id = "inv-1"
        data.student_id = None
        data.amount = 20
        data.payment_method = "cash"
        data.reference = None
        with pytest.raises(HTTPException) as exc:
            record_payment(db, "school-1", data, "user-1")
        assert "exceed" in str(exc.value.detail).lower()


class TestFix7_PeriodLocking:
    def test_blocks_payment_in_locked_period(self):
        db = _make_db()
        period = MagicMock()
        period.name = "June 2026"
        db.query.return_value.filter.return_value.first.return_value = period
        from app.services.finance_service import record_payment
        data = MagicMock()
        data.idempotency_key = None
        data.payment_date = date(2026, 6, 25)
        data.invoice_id = None
        data.student_id = None
        data.amount = 100
        data.payment_method = "cash"
        data.reference = None
        with pytest.raises(HTTPException) as exc:
            record_payment(db, "school-1", data, "user-1")
        assert "locked" in str(exc.value.detail).lower()

    @patch("app.services.finance_service._next_payment_number", return_value="PAY-2026-00001")
    def test_allows_payment_in_unlocked_period(self, mock_npn):
        db = _make_db()
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = None
        with patch("app.services.finance_service._create_payment_journal_entry") as mock_je:
            mock_je.return_value = MagicMock(id="je-3")
            from app.services.finance_service import record_payment
            data = MagicMock()
            data.idempotency_key = None
            data.payment_date = date(2026, 6, 25)
            data.invoice_id = None
            data.student_id = None
            data.amount = 100
            data.payment_method = "cash"
            data.reference = None
            result = record_payment(db, "school-1", data, "user-1")
            assert result is not None


class TestFix5_WalletGL:
    @patch("app.services.finance_service._next_entry_number", return_value="JE-2026-00001")
    def test_wallet_topup_creates_journal_entry(self, mock_nen):
        db = _make_db()
        from app.services.finance_service import _create_wallet_journal_entry
        wallet = MagicMock()
        wallet.student_id = "stu-1"
        wt = MagicMock()
        wt.transaction_type = "top_up"
        wt.amount = Decimal("50.00")
        from app.models.student import Student
        student = MagicMock()
        student.school_id = "school-1"
        db.query.return_value.filter.return_value.first.side_effect = [None, None, student, None, None]
        entry = _create_wallet_journal_entry(db, wallet, wt, "user-1")
        lines = [c for c in db.add.call_args_list if "JournalLine" in str(c)]
        assert len(lines) == 2

    @patch("app.services.finance_service._next_entry_number", return_value="JE-2026-00001")
    def test_wallet_withdrawal_reverses_entry(self, mock_nen):
        db = _make_db()
        wallet = MagicMock()
        wallet.student_id = "stu-1"
        wt = MagicMock()
        wt.transaction_type = "withdrawal"
        wt.amount = Decimal("30.00")
        from app.models.student import Student
        student = MagicMock()
        student.school_id = "school-1"
        db.query.return_value.filter.return_value.first.side_effect = [None, None, student, None, None]
        from app.services.finance_service import _create_wallet_journal_entry
        entry = _create_wallet_journal_entry(db, wallet, wt, "user-1")
        lines = [c for c in db.add.call_args_list if "JournalLine" in str(c)]
        assert len(lines) == 2
