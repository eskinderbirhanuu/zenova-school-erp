"""Tests for parent portal/payments endpoints — resolves parent via Parent.user_id."""
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.parent_portal import (
    parent_portal_dashboard,
    get_linked_student_ids,
)
from app.api.v1.endpoints.parent_payments import (
    parent_payment_dashboard,
)
from app.services.parent_service import get_parent_for_user


class TestGetParentForUser:
    def test_resolves_via_user_id(self):
        db = MagicMock()
        parent = MagicMock()
        parent.id = "parent-1"
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = parent
        result = get_parent_for_user(db, "user-1", "school-1")
        assert result is parent

    def test_scopes_by_school(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = get_parent_for_user(db, "user-1", "school-1")
        assert result is None


class TestParentPortalDashboard:
    def test_unlinked_user_gets_400_not_500(self):
        """Regression: User model has no parent_id; must resolve via Parent.user_id."""
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        with pytest.raises(HTTPException) as exc:
            parent_portal_dashboard(db=db, current_user=user)
        assert exc.value.status_code == 400

    def test_linked_user_returns_dashboard(self):
        db = MagicMock()
        parent = MagicMock()
        parent.id = "parent-1"
        parent.full_name = "Parent User"
        parent.phone_1 = "+251900000000"
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = parent
        link = MagicMock()
        link.student_id = "student-1"
        db.query.return_value.filter.return_value.all.return_value = [link]
        student = MagicMock()
        student.id = "student-1"
        student.first_name = "Alice"
        student.middle_name = None
        student.last_name = "Smith"
        student.student_id = "STU-1"
        student.class_id = None
        student.photo_url = None
        db.query.return_value.filter.return_value.all.side_effect = [
            [link],          # links
            [student],       # students
            [],              # classes
        ]
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        with patch("app.api.v1.endpoints.parent_portal._build_attendance_summary", return_value={}), \
             patch("app.api.v1.endpoints.parent_portal._build_grades", return_value={}), \
             patch("app.api.v1.endpoints.parent_portal._build_fees", return_value={}):
            result = parent_portal_dashboard(db=db, current_user=user)
        assert result["parent"]["full_name"] == "Parent User"
        assert len(result["children"]) == 1
        assert result["children"][0]["full_name"].replace("  ", " ") == "Alice Smith"


class TestGetLinkedStudentIds:
    def test_unlinked_user_raises_400(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        with pytest.raises(HTTPException) as exc:
            get_linked_student_ids(db, user)
        assert exc.value.status_code == 400


class TestParentPaymentDashboard:
    def test_unlinked_user_gets_400_not_500(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        with pytest.raises(HTTPException) as exc:
            parent_payment_dashboard(db=db, current_user=user)
        assert exc.value.status_code == 400
