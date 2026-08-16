"""Tests for APU student-portal finance (S1) and documents (S2) endpoints."""
from unittest.mock import MagicMock
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.student_portal import (
    student_portal_finance,
    student_portal_documents,
    _get_student_for_user,
)


def _make_student():
    student = MagicMock()
    student.id = "student-1"
    student.user_id = "user-1"
    student.school_id = "school-1"
    student.first_name = "Alice"
    student.last_name = "Smith"
    student.student_id = "STU-1"
    return student


def _make_user():
    user = MagicMock()
    user.id = "user-1"
    user.school_id = "school-1"
    return user


class TestGetStudentForUser:
    def test_unlinked_user_gets_404_not_500(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(HTTPException) as exc:
            _get_student_for_user(db, _make_user())
        assert exc.value.status_code == 404

    def test_resolves_via_user_id(self):
        db = MagicMock()
        student = _make_student()
        db.query.return_value.filter.return_value.first.return_value = student
        assert _get_student_for_user(db, _make_user()) is student


class TestStudentPortalFinance:
    def test_unlinked_user_gets_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(HTTPException) as exc:
            student_portal_finance(db=db, current_user=_make_user())
        assert exc.value.status_code == 404

    def test_returns_invoice_and_payment_history(self):
        db = MagicMock()
        student = _make_student()
        wallet = MagicMock()
        wallet.balance = 100

        inv = MagicMock()
        inv.id = "inv-1"
        inv.invoice_number = "INV-1"
        inv.total_amount = 1000
        inv.paid_amount = 400
        inv.status = "partial"
        inv.issue_date = None
        inv.due_date = None
        inv.deleted_at = None

        # Query 1 (Student) then Query 5 (Wallet): both use .filter().first()
        db.query.return_value.filter.return_value.first.side_effect = [student, wallet]
        # Query 2: Invoice lines (.filter().all())
        db.query.return_value.filter.return_value.all.return_value = []
        # Query 3: Invoice (.filter().order_by().all())
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [inv]
        # Query 4: Payment (.filter().order_by().limit().all())
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        result = student_portal_finance(db=db, current_user=_make_user())
        assert result["total_billed"] == 1000.0
        assert result["total_paid"] == 400.0
        assert result["outstanding_balance"] == 600.0
        assert result["wallet_balance"] == 100.0
        assert len(result["invoices"]) == 1
        assert result["invoices"][0]["balance"] == 600.0
        assert result["invoices"][0]["status"] == "partial"
        assert result["payment_history"] == []


class TestStudentPortalDocuments:
    def test_unlinked_user_gets_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(HTTPException) as exc:
            student_portal_documents(db=db, current_user=_make_user())
        assert exc.value.status_code == 404

    def test_returns_own_documents_metadata(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = _make_student()
        doc = MagicMock()
        doc.id = "doc-1"
        doc.filename = "transcript.pdf"
        doc.file_url = "uploads/students/student-1/x.pdf"
        doc.file_type = "application/pdf"
        doc.created_at = None
        doc.deleted_at = None
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = [doc]

        result = student_portal_documents(db=db, current_user=_make_user())
        assert len(result) == 1
        assert result[0]["filename"] == "transcript.pdf"
        assert result[0]["file_type"] == "application/pdf"
