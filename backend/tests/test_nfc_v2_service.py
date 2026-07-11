"""Tests for NFC v2 service — assign, scan, print requests."""
from unittest.mock import MagicMock, patch, ANY
import pytest
from datetime import datetime, timezone
from app.services import nfc_v2_service
from app.utils.uid_hash import hash_card_uid

HASH_B1 = hash_card_uid("04:A7:12:9C:B1")
HASH_B2 = hash_card_uid("04:A7:12:9C:B2")
HASH_B3 = hash_card_uid("04:A7:12:9C:B3")
HASH_B4 = hash_card_uid("04:A7:12:9C:B4")


class TestAssignStudentCard:
    def test_assign_new_card(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        card = nfc_v2_service.assign_student_card(db, "stu-1", "04:A7:12:9C:B1", "user-1")
        assert card.student_id == "stu-1"
        assert card.card_uid == HASH_B1
        assert db.add.called
        assert db.commit.called

    def test_assign_duplicate_uid_raises(self):
        db = MagicMock()
        existing = MagicMock()
        existing.card_uid = HASH_B1
        db.query.return_value.filter.return_value.first.return_value = existing
        with pytest.raises(ValueError, match="already assigned"):
            nfc_v2_service.assign_student_card(db, "stu-2", "04:A7:12:9C:B1")


class TestAssignStaffCard:
    def test_assign_new_card(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        card = nfc_v2_service.assign_staff_card(db, "sp-1", "04:A7:12:9C:B2", "user-1")
        assert card.staff_profile_id == "sp-1"
        assert card.card_uid == HASH_B2


class TestAssignParentCard:
    def test_assign_new_card(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        card = nfc_v2_service.assign_parent_card(db, "par-1", "04:A7:12:9C:B3", "user-1")
        assert card.parent_id == "par-1"
        assert card.card_uid == HASH_B3


class TestAssignEmployeeCard:
    def test_assign_new_card(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        card = nfc_v2_service.assign_employee_card(db, "emp-1", "04:A7:12:9C:B4", "user-1")
        assert card.employee_id == "emp-1"
        assert card.card_uid == HASH_B4


class TestScanNfc:
    def test_scan_active_student_card(self):
        db = MagicMock()
        card = MagicMock()
        card.card_uid = HASH_B1
        card.status = "active"
        card.expiry_date = None
        card.student_id = "stu-1"

        student = MagicMock()
        student.id = "stu-1"
        student.first_name = "John"
        student.middle_name = None
        student.last_name = "Doe"
        student.photo_url = "/photos/john.jpg"

        # student card found on first check
        def query_side(model):
            m = MagicMock()
            if model.__name__ == "StudentCard":
                m.filter.return_value.first.return_value = card
            elif model.__name__ == "Student":
                m.filter.return_value.first.return_value = student
            else:
                m.filter.return_value.first.return_value = None
            return m
        db.query.side_effect = query_side

        result = nfc_v2_service.scan_nfc(db, "04:A7:12:9C:B1", "attendance", "Gate A")
        assert result["success"] is True
        assert result["reference_type"] == "student"
        assert result["person_name"] == "John Doe"
        assert result["photo_url"] == "/photos/john.jpg"
        assert db.add.called

    def test_scan_inactive_returns_not_found(self):
        db = MagicMock()
        card = MagicMock()
        card.card_uid = hash_card_uid("XX:XX")
        card.status = "lost"
        card.expiry_date = None
        card.student_id = "stu-x"

        def query_side(model):
            m = MagicMock()
            if model.__name__ == "StudentCard":
                m.filter.return_value.first.return_value = card
            else:
                m.filter.return_value.first.return_value = None
            return m
        db.query.side_effect = query_side

        result = nfc_v2_service.scan_nfc(db, "XX:XX", "verification")
        assert result["success"] is False

    def test_scan_nonexistent_card(self):
        db = MagicMock()
        for model_type in ["StudentCard", "StaffCard", "ParentCard", "EmployeeCard"]:
            m = MagicMock()
            m.filter.return_value.first.return_value = None

        def query_side(model):
            m = MagicMock()
            m.filter.return_value.first.return_value = None
            return m
        db.query.side_effect = query_side

        result = nfc_v2_service.scan_nfc(db, "NONEXISTENT", "verification")
        assert result["success"] is False
        assert "not found" in result["message"]


class TestCardPrintRequests:
    def test_create_print_request(self):
        db = MagicMock()
        req = nfc_v2_service.request_card_print(db, "student", "stu-1", "user-1", "Print 1 card")
        assert req.card_type == "student"
        assert req.reference_id == "stu-1"
        assert db.add.called

    def test_approve_print_request(self):
        db = MagicMock()
        req = MagicMock()
        req.id = "req-1"
        req.status = "pending"
        db.query.return_value.filter.return_value.first.return_value = req

        result = nfc_v2_service.process_print_request(db, "req-1", "user-2", "approve")
        assert result.status == "approved"
        assert result.approved_by == "user-2"

    def test_mark_printed(self):
        db = MagicMock()
        req = MagicMock()
        req.id = "req-2"
        req.status = "approved"
        db.query.return_value.filter.return_value.first.return_value = req

        result = nfc_v2_service.process_print_request(db, "req-2", "user-3", "print")
        assert result.status == "printed"
        assert result.printed_by == "user-3"

    def test_process_nonexistent_request(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.process_print_request(db, "req-none", "user-2", "approve")
        assert result is None


class TestUpdateCardStatus:
    def test_update_status(self):
        db = MagicMock()
        card = MagicMock()
        card.id = "card-1"
        card.status = "active"
        db.query.return_value.filter.return_value.first.return_value = card

        ok = nfc_v2_service.update_card_status(db, "student", "card-1", "lost", "user-1")
        assert ok is True
        assert card.status == "lost"
        assert db.commit.called

    def test_update_status_invalid_type(self):
        db = MagicMock()
        ok = nfc_v2_service.update_card_status(db, "unknown_type", "card-1", "lost", "user-1")
        assert ok is False

    def test_update_status_respects_school_id(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        ok = nfc_v2_service.update_card_status(db, "student", "card-1", "lost", "user-1")
        assert ok is False


class TestGetStudentByCard:
    def test_get_student_by_card_respects_school_id(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.get_student_by_card(db, "04:A7:12:9C:B1", school_id="school-a")
        assert result is None
        args, _ = db.query.return_value.filter.call_args_list[0]
        assert any("card_uid" in str(a) for a in args)

        def filter_side(*args, **kwargs):
            m = MagicMock()
            m.filter.return_value = m
            m.first.return_value = None
            return m
        db2 = MagicMock()
        db2.query.return_value.filter.side_effect = filter_side
        nfc_v2_service.get_student_by_card(db2, "04:A7:12:9C:B1", school_id="school-a")


class TestGetStaffByCard:
    def test_get_staff_by_card_respects_school_id(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.get_staff_by_card(db, "04:A7:12:9C:B2", school_id="school-a")
        assert result is None


class TestGetParentByCard:
    def test_get_parent_by_card_respects_school_id(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.get_parent_by_card(db, "04:A7:12:9C:B3", school_id="school-a")
        assert result is None


class TestGetEmployeeByCard:
    def test_get_employee_by_card_respects_school_id(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.get_employee_by_card(db, "04:A7:12:9C:B4", school_id="school-a")
        assert result is None


class TestListPrintRequests:
    def test_list_print_requests_default(self):
        db = MagicMock()
        db.query.return_value.order_by.return_value.limit.return_value.all.return_value = []
        result = nfc_v2_service.list_print_requests(db)
        assert result == []


class TestProcessPrintRequest:
    def test_process_print_request_default(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = nfc_v2_service.process_print_request(db, "req-1", "user-1", "approve")
        assert result is None
