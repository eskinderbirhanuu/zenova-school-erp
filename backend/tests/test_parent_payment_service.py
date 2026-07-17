"""Tests for parent payment service — sessions, invoices, dashboard."""
from unittest.mock import MagicMock, patch, ANY
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from app.services.parent_payment_service import (
    PaymentError, create_payment_session, get_parent_children_invoices,
    get_parent_dashboard, process_chapa_payment, request_refund,
    approve_refund, process_refund,
)


class TestGetParentChildrenInvoices:
    def test_returns_invoices(self):
        db = MagicMock()
        link = MagicMock()
        link.student_id = "stu-1"
        db.query.return_value.filter.return_value.all.return_value = [link]

        inv = MagicMock()
        inv.id = "inv-1"
        inv.invoice_number = "INV-001"
        inv.student_id = "stu-1"
        inv.total_amount = Decimal("500")
        inv.paid_amount = Decimal("100")
        inv.status = "pending"
        inv.due_date = date(2026, 8, 15)
        inv.issue_date = date(2026, 7, 1)
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [inv]

        student = MagicMock()
        student.id = "stu-1"
        student.first_name = "Alice"
        student.last_name = "Smith"
        db.query.return_value.filter.return_value.all.return_value = [student]

        line = MagicMock()
        line.description = "Tuition"
        line.amount = Decimal("500")
        db.query.return_value.filter.return_value.all.return_value = [line]

        result = get_parent_children_invoices(db, "parent-1", "school-1")
        assert len(result) == 1
        assert result[0]["invoice_number"] == "INV-001"
        assert result[0]["balance"] == 400.0

    def test_no_links_returns_empty(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_parent_children_invoices(db, "parent-1", "school-1")
        assert result == []


class TestGetParentDashboard:
    def test_returns_dashboard(self):
        db = MagicMock()
        link = MagicMock()
        link.student_id = "stu-1"
        student = MagicMock()
        student.id = "stu-1"
        student.first_name = "Alice"
        student.last_name = "Smith"
        student.student_id = "STU-001"
        inv = MagicMock()
        inv.id = "inv-1"
        inv.student_id = "stu-1"
        inv.total_amount = Decimal("500")
        inv.paid_amount = Decimal("100")
        inv.status = "pending"
        inv.due_date = date(2026, 8, 15)
        inv.issue_date = date(2026, 7, 1)
        invline = MagicMock()
        invline.description = "Tuition"
        invline.amount = Decimal("500")
        db.query.return_value.filter.return_value.all.side_effect = [
            [link],     # 1. ParentStudentLink (dashboard)
            [student],  # 2. Student (dashboard)
            [inv],      # 3. Invoice (dashboard)
            [link],     # 4. ParentStudentLink (get_parent_children_invoices)
            [inv],      # 5. Invoice (get_parent_children_invoices)
            [student],  # 6. Student (get_parent_children_invoices)
            [invline],  # 7. InvoiceLine (get_parent_children_invoices)
        ]
        result = get_parent_dashboard(db, "parent-1", "school-1")
        assert "total_outstanding" in result
        assert "children" in result
        assert len(result["children"]) == 1

    def test_no_links_empty_dashboard(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_parent_dashboard(db, "parent-1", "school-1")
        assert result["total_outstanding"] == 0.0
        assert result["children"] == []


class TestCreatePaymentSession:
    def test_creates_session(self):
        db = MagicMock()
        link = MagicMock()
        invoice = MagicMock()
        invoice.status = "pending"
        invoice.total_amount = Decimal("500")
        invoice.paid_amount = Decimal("0")
        db.query.return_value.filter.return_value.first.side_effect = [
            link,     # ParentStudentLink check
            invoice,  # Invoice lookup
        ]
        result = create_payment_session(db, "parent-1", "stu-1", "inv-1",
                                        Decimal("200"), "chapa", "school-1")
        assert result.status == "pending"
        assert result.amount == Decimal("200")
        assert db.add.called

    def test_no_invoice_id_creates_session(self):
        db = MagicMock()
        link = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = link
        result = create_payment_session(db, "parent-1", "stu-1", None,
                                        Decimal("200"), "cash", "school-1")
        assert result.status == "pending"

    def test_parent_not_linked_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(PaymentError, match="not linked"):
            create_payment_session(db, "parent-1", "stu-1", "inv-1",
                                   Decimal("200"), "chapa", "school-1")

    def test_invoice_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [
            MagicMock(),  # link found
            None,  # invoice not found
        ]
        with pytest.raises(PaymentError, match="Invoice not found"):
            create_payment_session(db, "parent-1", "stu-1", "inv-1",
                                   Decimal("200"), "chapa", "school-1")

    def test_already_paid_raises(self):
        db = MagicMock()
        invoice = MagicMock()
        invoice.status = "paid"
        db.query.return_value.filter.return_value.first.side_effect = [
            MagicMock(),  # link found
            invoice,  # invoice found
        ]
        with pytest.raises(PaymentError, match="already paid"):
            create_payment_session(db, "parent-1", "stu-1", "inv-1",
                                   Decimal("200"), "chapa", "school-1")

    def test_amount_exceeds_balance_raises(self):
        db = MagicMock()
        invoice = MagicMock()
        invoice.status = "pending"
        invoice.total_amount = Decimal("500")
        invoice.paid_amount = Decimal("400")
        db.query.return_value.filter.return_value.first.side_effect = [
            MagicMock(),  # link found
            invoice,  # invoice found
        ]
        with pytest.raises(PaymentError, match="exceeds invoice balance"):
            create_payment_session(db, "parent-1", "stu-1", "inv-1",
                                   Decimal("200"), "chapa", "school-1")


class TestProcessChapaPayment:
    def test_processes_payment(self, patch_audit):
        db = MagicMock()
        session = MagicMock()
        session.status = "pending"
        session.school_id = "school-1"
        session.invoice_id = "inv-1"
        session.student_id = "stu-1"
        session.parent_id = "parent-1"
        session.amount = Decimal("200")
        invoice = MagicMock()
        invoice.paid_amount = Decimal("0")
        invoice.total_amount = Decimal("500")
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            session,  # payment session lookup
            None,  # no existing payment (idempotency)
            invoice,  # invoice lookup
        ]
        chapa_resp = {"reference": "chapa-ref-1", "status": "completed"}
        with patch("app.services.parent_payment_service._validate_chapa_response", return_value=True), \
             patch("app.services.parent_payment_service._create_receipt"), \
             patch("app.services.parent_payment_service._create_payment_journal_entry"), \
             patch("app.services.parent_payment_service._next_sequence_number", return_value="PAY-2026-00001"), \
             patch("app.services.platform_commission_service.record_transaction"), \
             patch("app.services.platform_commission_service.record_platform_fee"):
            result = process_chapa_payment(db, "session-1", chapa_resp)
            assert result.payment_method == "chapa"

    def test_session_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = None
        with pytest.raises(PaymentError, match="Payment session not found"):
            process_chapa_payment(db, "session-nonexistent", {})

    def test_session_already_completed_raises(self):
        db = MagicMock()
        session = MagicMock()
        session.status = "completed"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = session
        with pytest.raises(PaymentError, match="already completed"):
            process_chapa_payment(db, "session-1", {})

    def test_invalid_signature_raises(self):
        db = MagicMock()
        session = MagicMock()
        session.status = "pending"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = session
        with patch("app.services.parent_payment_service._validate_chapa_response",
                   return_value=False):
            with pytest.raises(PaymentError, match="Invalid Chapa signature"):
                process_chapa_payment(db, "session-1", {})

    def test_duplicate_payment_raises(self):
        db = MagicMock()
        session = MagicMock()
        session.status = "pending"
        session.school_id = "school-1"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            session,  # session lookup
            MagicMock(),  # existing payment found (idempotency check)
        ]
        with patch("app.services.parent_payment_service._validate_chapa_response",
                   return_value=True):
            with pytest.raises(PaymentError, match="already processed"):
                process_chapa_payment(db, "session-1", {"reference": "ref-1"})


class TestRequestRefund:
    def test_requests_refund(self):
        db = MagicMock()
        payment = MagicMock()
        payment.id = "pay-1"
        payment.school_id = "school-1"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            None,  # existing refund check — no existing refund
        ]
        db.query.return_value.filter.return_value.filter.return_value.with_for_update.return_value.first.return_value = payment
        with patch("app.services.parent_payment_service._next_sequence_number", return_value="RFD-2026-00001"):
            result = request_refund(db, "pay-1", Decimal("50"), "overpayment",
                                    "parent-1", "school-1")
            assert result is not None
            assert db.add.called

    def test_payment_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.with_for_update.return_value.first.return_value = None
        with pytest.raises(PaymentError, match="Payment not found"):
            request_refund(db, "pay-nonexistent", Decimal("50"),
                           "reason", "parent-1", "school-1")


class TestApproveRefund:
    def test_approves_refund(self):
        db = MagicMock()
        refund = MagicMock()
        refund.status = "pending"
        db.query.return_value.filter.return_value.first.return_value = refund
        result = approve_refund(db, "refund-1", "user-1", "school-1")
        assert refund.status == "approved"

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(PaymentError, match="Refund not found"):
            approve_refund(db, "refund-nonexistent", "user-1", "school-1")


class TestProcessRefund:
    def test_processes_refund(self):
        db = MagicMock()
        refund = MagicMock()
        refund.status = "approved"
        refund.payment_id = "pay-1"
        refund.school_id = "school-1"
        refund.amount = Decimal("50")
        refund.refund_number = "RFD-001"
        receipt = MagicMock()
        receipt.status = "active"
        invoice = MagicMock()
        invoice.paid_amount = Decimal("200")
        invoice.total_amount = Decimal("500")
        db.query.return_value.filter.return_value.first.side_effect = [
            refund,   # Refund lookup
            receipt,  # Receipt lookup
            invoice,  # Invoice lookup
        ]
        result = process_refund(db, "refund-1", "user-1", "school-1")
        assert refund.status == "processed"

    def test_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(PaymentError, match="Refund not found"):
            process_refund(db, "refund-nonexistent", "user-1", "school-1")
