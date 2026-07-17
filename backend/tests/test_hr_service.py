"""Tests for HR service — contracts, leave, attendance, performance reviews."""
from unittest.mock import MagicMock, patch, ANY
from datetime import date, datetime
from decimal import Decimal
import pytest
from app.services.hr_service import (
    create_contract, get_contracts, terminate_contract,
    create_leave_type, get_leave_types, request_leave,
    approve_leave, reject_leave, get_leave_requests,
    init_leave_balance, get_leave_balances,
    mark_attendance, bulk_mark_attendance, update_attendance, get_attendance,
    create_performance_review, get_performance_reviews,
)
from app.core.exceptions import NotFoundException, BadRequestException


class TestContracts:
    def test_create_contract(self):
        db = MagicMock()
        data = MagicMock()
        data.staff_profile_id = "sp-1"
        data.contract_type = "permanent"
        data.start_date = date(2026, 1, 1)
        data.end_date = date(2026, 12, 31)
        data.position = "Teacher"
        data.department = "Science"
        data.basic_salary = Decimal("50000")
        data.notes = "Good standing"
        c = create_contract(db, data, "user-1", "school-1")
        assert c.staff_profile_id == "sp-1"
        assert db.add.call_count >= 1
        db.commit.assert_called_once()

    def test_get_contracts_filters_by_school(self):
        db = MagicMock()
        get_contracts(db, "school-1")
        db.query.return_value.filter.assert_called_once()

    def test_get_contracts_filters_by_staff(self):
        db = MagicMock()
        get_contracts(db, "school-1", staff_profile_id="sp-1")
        db.query.return_value.filter.assert_called_once()

    def test_terminate_contract_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Contract not found"):
            terminate_contract(db, "c-1", date(2026, 6, 1), "user-1", "school-1")

    def test_terminate_contract_success(self):
        db = MagicMock()
        c = MagicMock()
        c.id = "c-1"
        db.query.return_value.filter.return_value.first.return_value = c
        result = terminate_contract(db, "c-1", date(2026, 6, 1), "user-1", "school-1")
        assert c.status == "terminated"
        assert c.end_date == date(2026, 6, 1)
        assert result == c


class TestLeaveTypes:
    def test_create_leave_type(self):
        db = MagicMock()
        data = MagicMock()
        data.name = "Annual"
        data.default_days = 20
        data.is_paid = True
        lt = create_leave_type(db, "school-1", data, "user-1")
        assert lt.name == "Annual"
        assert db.add.call_count >= 1
        db.commit.assert_called_once()

    def test_get_leave_types(self):
        db = MagicMock()
        get_leave_types(db, "school-1")
        db.query.return_value.filter.assert_called_once()


class TestLeaveRequests:
    def test_request_leave_success(self):
        db = MagicMock()
        data = MagicMock()
        data.staff_profile_id = "sp-1"
        data.leave_type_id = "lt-1"
        data.start_date = date(2026, 7, 1)
        data.end_date = date(2026, 7, 5)
        data.reason = "Vacation"
        sp = MagicMock()
        sp.id = "sp-1"
        bal = MagicMock()
        bal.remaining_days = 15
        db.query.return_value.filter.return_value.first.side_effect = [sp, bal]
        lr = request_leave(db, data, "user-1", "school-1")
        assert lr.reason == "Vacation"
        assert db.add.call_count >= 1

    def test_request_leave_staff_not_found(self):
        db = MagicMock()
        data = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Staff profile not found"):
            request_leave(db, data, "user-1", "school-1")

    def test_request_leave_insufficient_balance(self):
        db = MagicMock()
        data = MagicMock()
        data.staff_profile_id = "sp-1"
        data.leave_type_id = "lt-1"
        data.start_date = date(2026, 7, 1)
        data.end_date = date(2026, 7, 10)
        sp = MagicMock()
        sp.id = "sp-1"
        bal = MagicMock()
        bal.remaining_days = 5
        db.query.return_value.filter.return_value.first.side_effect = [sp, bal]
        with pytest.raises(BadRequestException, match="Insufficient leave balance"):
            request_leave(db, data, "user-1", "school-1")

    def test_approve_leave(self):
        db = MagicMock()
        lr = MagicMock()
        lr.staff_profile_id = "sp-1"
        lr.leave_type_id = "lt-1"
        lr.start_date = date(2026, 7, 1)
        lr.days = 5
        bal = MagicMock()
        bal.total_days = 20
        bal.used_days = 5
        bal.remaining_days = 15
        db.query.return_value.join.return_value.filter.return_value.first.side_effect = [lr, bal]
        result = approve_leave(db, "lr-1", "user-1", "school-1")
        assert lr.status == "approved"
        db.commit.assert_called_once()

    def test_approve_leave_not_found(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Leave request not found"):
            approve_leave(db, "lr-1", "user-1", "school-1")

    def test_reject_leave(self):
        db = MagicMock()
        lr = MagicMock()
        lr.staff_profile_id = "sp-1"
        lr.leave_type_id = "lt-1"
        lr.start_date = date(2026, 7, 1)
        lr.days = 3
        db.query.return_value.join.return_value.filter.return_value.first.return_value = lr
        result = reject_leave(db, "lr-1", "user-1", "school-1")
        assert lr.status == "rejected"

    def test_reject_leave_not_found(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Leave request not found"):
            reject_leave(db, "lr-1", "user-1", "school-1")

    def test_get_leave_requests(self):
        db = MagicMock()
        get_leave_requests(db, "school-1")
        db.query.return_value.join.return_value.filter.assert_called_once()


class TestLeaveBalances:
    def test_init_leave_balance(self):
        db = MagicMock()
        bal = init_leave_balance(db, "sp-1", "lt-1", 2026, 20)
        assert bal.total_days == 20
        assert bal.remaining_days == 20
        db.add.assert_called_once()

    def test_get_leave_balances(self):
        db = MagicMock()
        get_leave_balances(db, "school-1", "sp-1", year=2026)
        db.query.return_value.join.return_value.filter.assert_called_once()


class TestAttendance:
    def test_mark_attendance_success(self):
        db = MagicMock()
        data = MagicMock()
        data.staff_profile_id = "sp-1"
        data.student_id = "stu-1"
        data.date = date(2026, 7, 15)
        data.check_in = "08:00"
        data.check_out = "16:00"
        data.status = "present"
        db.query.return_value.filter.return_value.first.return_value = None
        a = mark_attendance(db, "school-1", data, "user-1")
        assert a.status == "present"
        db.add.assert_called_once()

    def test_mark_attendance_duplicate(self):
        db = MagicMock()
        data = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing
        with pytest.raises(BadRequestException, match="Attendance already marked"):
            mark_attendance(db, "school-1", data, "user-1")

    def test_bulk_mark_attendance(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [None, MagicMock(), None]
        records = [
            {"staff_profile_id": "sp-1", "student_id": "stu-1", "date": date(2026, 7, 15), "status": "present"},
            {"staff_profile_id": "sp-2", "student_id": "stu-2", "date": date(2026, 7, 15), "status": "present"},
            {"staff_profile_id": "sp-3", "student_id": "stu-3", "date": date(2026, 7, 15), "status": "absent"},
        ]
        result = bulk_mark_attendance(db, "school-1", records, "user-1")
        assert result["created"] == 2
        assert len(result["errors"]) == 1

    def test_update_attendance_success(self):
        db = MagicMock()
        a = MagicMock()
        a.id = "att-1"
        data = MagicMock()
        data.check_in = "09:00"
        data.check_out = "17:00"
        data.status = "late"
        db.query.return_value.filter.return_value.first.return_value = a
        result = update_attendance(db, "att-1", data, "user-1", "school-1")
        assert a.check_in == "09:00"
        assert a.status == "late"

    def test_update_attendance_not_found(self):
        db = MagicMock()
        data = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Attendance record not found"):
            update_attendance(db, "att-1", data, "user-1", "school-1")

    def test_get_attendance(self):
        db = MagicMock()
        get_attendance(db, "school-1", date_filter=date(2026, 7, 15))
        db.query.return_value.filter.assert_called_once()


class TestPerformanceReviews:
    def test_create_performance_review(self):
        db = MagicMock()
        data = MagicMock()
        data.staff_profile_id = "sp-1"
        data.period = "2026-H1"
        data.rating = 4
        data.comments = "Excellent"
        pr = create_performance_review(db, data, "user-1", "school-1")
        assert pr.rating == 4
        assert db.add.call_count >= 1
        db.commit.assert_called_once()

    def test_get_performance_reviews(self):
        db = MagicMock()
        get_performance_reviews(db, "school-1", staff_profile_id="sp-1")
        db.query.return_value.filter.assert_called_once()
