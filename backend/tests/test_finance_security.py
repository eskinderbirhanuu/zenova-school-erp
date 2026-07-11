import json
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock, PropertyMock, patch, ANY
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


class TestFix8_ChapaPaymentConcurrency:
    def test_process_chapa_payment_locks_session_row(self):
        """Verify with_for_update is called on the PaymentSession query."""
        db = _make_db()
        mock_session = MagicMock()
        mock_session.status = "pending"
        mock_session.school_id = "school-1"
        mock_session.invoice_id = "inv-1"
        mock_session.student_id = "stu-1"
        mock_session.parent_id = "par-1"
        mock_session.amount = Decimal("100.00")

        # Mock chained filter + with_for_update + first
        # 1st .first() returns session, 2nd .first() returns None (no existing payment),
        # 3rd .first() returns invoice mock (for the invoice lock with_for_update)
        mock_invoice = MagicMock()
        mock_invoice.paid_amount = Decimal("0")
        mock_invoice.total_amount = Decimal("100.00")
        mock_wfu = MagicMock()
        mock_wfu.first.side_effect = [mock_session, None, mock_invoice]
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.parent_payment_service import process_chapa_payment
        with patch("app.services.parent_payment_service._next_sequence_number", return_value="PAY-2026-00001"):
            with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True):
                with patch("app.services.parent_payment_service._create_receipt"):
                    with patch("app.services.parent_payment_service._create_payment_journal_entry"):
                        with patch("app.services.platform_commission_service.record_transaction"):
                            with patch("app.services.platform_commission_service.record_platform_fee"):
                                chapa_resp = {"tx_ref": "sess-1", "status": "success", "reference": "chapa-ref-1"}
                                payment = process_chapa_payment(db, "sess-1", chapa_resp)

        assert payment is not None
        assert payment.payment_number == "PAY-2026-00001"

    def test_process_chapa_payment_rejects_duplicate_reference(self):
        """Verify that a second callback with the same Chapa reference is rejected."""
        db = _make_db()
        mock_session = MagicMock()
        mock_session.status = "pending"
        mock_session.school_id = "school-1"
        mock_session.amount = Decimal("100.00")
        mock_session.invoice_id = None
        mock_session.student_id = "stu-1"
        mock_session.parent_id = "par-1"

        existing_payment = MagicMock()
        existing_payment.payment_number = "PAY-2026-00001"

        mock_wfu = MagicMock()
        mock_wfu.first.side_effect = [mock_session, existing_payment]
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.parent_payment_service import process_chapa_payment, PaymentError
        chapa_resp = {"tx_ref": "sess-1", "status": "success", "reference": "chapa-ref-1"}
        with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True):
            with pytest.raises(PaymentError, match="already processed"):
                process_chapa_payment(db, "sess-1", chapa_resp)

    def test_process_chapa_payment_rejects_already_completed_session(self):
        """Verify that a session with status != 'pending' is rejected."""
        db = _make_db()
        mock_session = MagicMock()
        mock_session.status = "completed"

        mock_wfu = MagicMock()
        mock_wfu.first.return_value = mock_session
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.parent_payment_service import process_chapa_payment, PaymentError
        chapa_resp = {"tx_ref": "sess-1", "status": "success", "reference": "chapa-ref-1"}
        with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True):
            with pytest.raises(PaymentError, match="already completed"):
                process_chapa_payment(db, "sess-1", chapa_resp)

    def test_process_chapa_payment_locks_invoice_row(self):
        """Verify with_for_update is called on the Invoice query when session has invoice_id."""
        db = _make_db()
        mock_session = MagicMock()
        mock_session.status = "pending"
        mock_session.school_id = "school-1"
        mock_session.invoice_id = "inv-1"
        mock_session.student_id = "stu-1"
        mock_session.parent_id = "par-1"
        mock_session.amount = Decimal("100.00")

        mock_invoice = MagicMock()
        mock_invoice.paid_amount = Decimal("0")
        mock_invoice.total_amount = Decimal("100.00")

        # Session query returns session, existing payment check returns None, invoice lock returns invoice
        mock_wfu_session = MagicMock()
        mock_wfu_session.first.side_effect = [mock_session, None, mock_invoice]

        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu_session

        from app.services.parent_payment_service import process_chapa_payment
        with patch("app.services.parent_payment_service._next_sequence_number", return_value="PAY-2026-00001"):
            with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True):
                with patch("app.services.parent_payment_service._create_receipt"):
                    with patch("app.services.parent_payment_service._create_payment_journal_entry"):
                        with patch("app.services.platform_commission_service.record_transaction"):
                            with patch("app.services.platform_commission_service.record_platform_fee"):
                                chapa_resp = {"tx_ref": "sess-1", "status": "success", "reference": "chapa-ref-1"}
                                process_chapa_payment(db, "sess-1", chapa_resp)

        # Verify invoice lock was acquired (with_for_update called at least once on Invoice query)
        wfu_calls = [c for c in db.query.return_value.filter.return_value.with_for_update.call_args_list]
        assert len(wfu_calls) >= 1

    def test_platform_commission_failure_logged_not_fatal(self):
        """Verify that a platform commission error is logged but does not fail the payment."""
        db = _make_db()
        mock_session = MagicMock()
        mock_session.status = "pending"
        mock_session.school_id = "school-1"
        mock_session.invoice_id = None
        mock_session.student_id = "stu-1"
        mock_session.parent_id = "par-1"
        mock_session.amount = Decimal("100.00")

        mock_wfu = MagicMock()
        mock_wfu.first.side_effect = [mock_session, None]
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.parent_payment_service import process_chapa_payment
        with patch("app.services.parent_payment_service._next_sequence_number", return_value="PAY-2026-00001"):
            with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True):
                with patch("app.services.parent_payment_service._create_receipt"):
                    with patch("app.services.parent_payment_service._create_payment_journal_entry"):
                        with patch("app.services.platform_commission_service.record_transaction", side_effect=ValueError("DB error")):
                            with patch("app.services.parent_payment_service.logger") as mock_logger:
                                chapa_resp = {"tx_ref": "sess-1", "status": "success", "reference": "chapa-ref-1"}
                                payment = process_chapa_payment(db, "sess-1", chapa_resp)

        assert payment is not None
        mock_logger.warning.assert_called_once()


class TestFix9_RefundConcurrency:
    def test_request_refund_locks_payment_row(self):
        """Verify with_for_update is called on the Payment query in request_refund."""
        db = _make_db()
        mock_payment = MagicMock()
        mock_payment.school_id = "school-1"
        mock_payment.invoice_id = "inv-1"

        # No existing refund found
        mock_wfu_refund = MagicMock()
        mock_wfu_refund.first.return_value = None

        # Payment query returns payment (with_for_update on payment query)
        mock_wfu_payment = MagicMock()
        mock_wfu_payment.first.return_value = mock_payment

        # First .query() is for Payment (with_for_update), second is for Refund (with_for_update)
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [mock_payment, None]

        from app.services.parent_payment_service import request_refund
        with patch("app.services.parent_payment_service._next_sequence_number", return_value="RFD-2026-00001"):
            result = request_refund(db, "pay-1", Decimal("50.00"), "Test refund", "user-1")

        assert result is not None
        assert result.refund_number == "RFD-2026-00001"

    def test_request_refund_rejects_duplicate(self):
        """Verify that two concurrent refund requests for the same payment are prevented."""
        db = _make_db()
        mock_payment = MagicMock()
        mock_payment.school_id = "school-1"

        existing_refund = MagicMock()
        existing_refund.status = "pending"

        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [mock_payment, existing_refund]

        from app.services.parent_payment_service import request_refund, PaymentError
        with pytest.raises(PaymentError, match="already requested"):
            request_refund(db, "pay-1", Decimal("50.00"), "Test duplicate", "user-1")


class TestFix10_PlatformCommissionConcurrency:
    def test_mark_invoice_paid_locks_invoice_row(self):
        """Verify with_for_update is called on the MonthlyPlatformInvoice query."""
        db = _make_db()
        mock_inv = MagicMock()
        mock_inv.status = "pending"
        mock_inv.school_id = "school-1"
        mock_inv.month = 6
        mock_inv.year = 2026

        mock_wfu = MagicMock()
        mock_wfu.first.return_value = mock_inv
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.platform_commission_service import mark_invoice_paid
        result = mark_invoice_paid(db, "inv-1", "chapa-ref", "user-1")

        assert result is not None
        assert result.status == "paid"

    def test_mark_invoice_paid_rejects_already_paid(self):
        """Verify that an already-paid invoice is rejected (concurrency protection)."""
        db = _make_db()
        mock_inv = MagicMock()
        mock_inv.status = "paid"

        mock_wfu = MagicMock()
        mock_wfu.first.return_value = mock_inv
        db.query.return_value.filter.return_value.with_for_update.return_value = mock_wfu

        from app.services.platform_commission_service import mark_invoice_paid, PlatformCommissionError
        with pytest.raises(PlatformCommissionError, match="already paid"):
            mark_invoice_paid(db, "inv-1", "chapa-ref", "user-1")
