"""Tests for attendance service — mark, bulk, update, get."""
from unittest.mock import MagicMock, patch, ANY
from datetime import date
import pytest
from app.services.hr_service import mark_attendance, bulk_mark_attendance, update_attendance, get_attendance
from app.core.exceptions import BadRequestException, NotFoundException


class MockAttendanceData:
    def __init__(self, staff_profile_id="sp-1", student_id="stu-1", att_date=None,
                 check_in=None, check_out=None, status="present", reason=None):
        self.staff_profile_id = staff_profile_id
        self.student_id = student_id
        self.date = att_date or date(2026, 7, 16)
        self.check_in = check_in
        self.check_out = check_out
        self.status = status
        self.reason = reason


class TestMarkAttendance:
    def test_mark_new_attendance(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockAttendanceData()
        result = mark_attendance(db, "school-1", data, "user-1")
        assert result.staff_profile_id == "sp-1"
        assert result.student_id == "stu-1"
        assert result.status == "present"
        assert db.add.called
        assert db.commit.called

    def test_mark_duplicate_raises(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.filter.return_value.filter.return_value.first.return_value = existing
        data = MockAttendanceData()
        with pytest.raises(BadRequestException, match="already marked"):
            mark_attendance(db, "school-1", data, "user-1")

    def test_mark_with_check_times(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockAttendanceData(check_in="08:00", check_out="16:00")
        result = mark_attendance(db, "school-1", data, "user-1")
        assert result.check_in == "08:00"
        assert result.check_out == "16:00"

    def test_mark_with_reason(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockAttendanceData(status="late", reason="Traffic")
        result = mark_attendance(db, "school-1", data, "user-1")
        assert result.status == "late"
        assert result.reason == "Traffic"


class TestBulkMarkAttendance:
    def test_bulk_all_success(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        records = [
            {"staff_profile_id": "sp-1", "student_id": "stu-1", "date": date(2026, 7, 16)},
            {"staff_profile_id": "sp-2", "student_id": "stu-2", "date": date(2026, 7, 16)},
        ]
        result = bulk_mark_attendance(db, "school-1", records, "user-1")
        assert result["created"] == 2
        assert result["errors"] == []

    def test_bulk_with_duplicates(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock()  # always "exists"
        records = [
            {"staff_profile_id": "sp-1", "student_id": "stu-1", "date": date(2026, 7, 16)},
        ]
        result = bulk_mark_attendance(db, "school-1", records, "user-1")
        assert result["created"] == 0
        assert len(result["errors"]) == 1
        assert "Duplicate" in result["errors"][0]["reason"]

    def test_bulk_mixed_success_and_duplicates(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [existing, None]
        # First call returns existing (duplicate), second returns None (success)
        records = [
            {"staff_profile_id": "sp-1", "student_id": "stu-1", "date": date(2026, 7, 16)},
            {"staff_profile_id": "sp-2", "student_id": "stu-2", "date": date(2026, 7, 16)},
        ]
        result = bulk_mark_attendance(db, "school-1", records, "user-1")
        assert result["created"] == 1
        assert len(result["errors"]) == 1


class TestUpdateAttendance:
    def test_update_status(self):
        db = MagicMock()
        attendance = MagicMock()
        attendance.check_in = None
        attendance.check_out = None
        attendance.status = "present"
        attendance.reason = None
        db.query.return_value.filter.return_value.first.return_value = attendance
        data = MockAttendanceData(status="absent")
        result = update_attendance(db, "att-1", data, "user-1", "school-1")
        assert result.status == "absent"

    def test_update_check_times(self):
        db = MagicMock()
        attendance = MagicMock()
        attendance.check_in = None
        attendance.check_out = None
        attendance.status = "present"
        db.query.return_value.filter.return_value.first.return_value = attendance
        data = MockAttendanceData(check_in="09:00", check_out="17:00")
        result = update_attendance(db, "att-1", data, "user-1", "school-1")
        assert result.check_in == "09:00"
        assert result.check_out == "17:00"

    def test_update_reason(self):
        db = MagicMock()
        attendance = MagicMock()
        attendance.status = "late"
        attendance.reason = None
        db.query.return_value.filter.return_value.first.return_value = attendance
        data = MockAttendanceData(status="late", reason="Bus delay")
        result = update_attendance(db, "att-1", data, "user-1", "school-1")
        assert result.reason == "Bus delay"

    def test_update_not_found_raises(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MockAttendanceData()
        with pytest.raises(NotFoundException, match="not found"):
            update_attendance(db, "att-nonexistent", data, "user-1", "school-1")

    def test_update_partial(self):
        db = MagicMock()
        attendance = MagicMock()
        attendance.check_in = "08:00"
        attendance.check_out = None
        attendance.status = "present"
        attendance.reason = None
        db.query.return_value.filter.return_value.first.return_value = attendance
        data = MockAttendanceData(check_in=None, check_out="17:00", status=None)
        result = update_attendance(db, "att-1", data, "user-1", "school-1")
        assert result.check_in == "08:00"
        assert result.check_out == "17:00"
        assert result.status == "present"


class TestGetAttendance:
    def test_get_all(self):
        db = MagicMock()
        expected = [MagicMock(), MagicMock()]
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = expected
        result = get_attendance(db, "school-1")
        assert len(result) == 2

    def test_get_empty(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        result = get_attendance(db, "school-1")
        assert result == []

    def test_get_by_date(self):
        db = MagicMock()
        mock_q = MagicMock()
        db.query.return_value.filter.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = [MagicMock()]
        result = get_attendance(db, "school-1", date_filter=date(2026, 7, 16))
        assert len(result) == 1

    def test_get_by_staff_id(self):
        db = MagicMock()
        mock_q = MagicMock()
        db.query.return_value.filter.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.all.return_value = [MagicMock()]
        result = get_attendance(db, "school-1", staff_id="sp-1")
        assert len(result) == 1
