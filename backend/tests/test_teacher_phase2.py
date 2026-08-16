"""Tests for APU Phase 2 teacher backend changes — roster filter (T1) and
bulk-attendance idempotency (T3)."""
from unittest.mock import MagicMock, patch
from datetime import date
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.attendance import mark_attendance_bulk
from app.api.v1.endpoints.teachers import get_my_students


class TestAttendanceBulkIdempotency:
    def test_replay_with_key_returns_stored_response(self):
        db = MagicMock()
        existing = MagicMock()
        existing.response = '{"created": 3, "errors": []}'
        db.query.return_value.filter.return_value.first.return_value = existing
        user = MagicMock()
        user.school_id = "school-1"
        result = mark_attendance_bulk(
            records=[],
            x_idempotency_key="key-1",
            db=db,
            current_user=user,
        )
        assert result.created == 3
        assert result.errors == []
        db.add.assert_not_called()
        db.commit.assert_not_called()

    def test_new_key_processes_and_stores(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.all.return_value = []
        user = MagicMock()
        user.school_id = "school-1"
        user.id = "user-1"
        item = MagicMock()
        item.student_id = None
        item.staff_profile_id = None
        item.date = date(2026, 8, 9)
        item.status = "present"
        item.reason = None
        with patch("app.api.v1.endpoints.attendance._attendance_window_open", return_value=True):
            result = mark_attendance_bulk(
                records=[item],
                x_idempotency_key="key-2",
                db=db,
                current_user=user,
            )
        assert result.created == 1
        batch_added = [a for a in db.add.call_args_list if a.args and a.args[0].__class__.__name__ == "AttendanceBatch"]
        assert batch_added, "AttendanceBatch should be persisted with the response"

    def test_no_key_skips_storage(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.all.return_value = []
        user = MagicMock()
        user.school_id = "school-1"
        item = MagicMock()
        item.student_id = None
        item.staff_profile_id = None
        item.date = date(2026, 8, 9)
        item.status = "present"
        item.reason = None
        with patch("app.api.v1.endpoints.attendance._attendance_window_open", return_value=True):
            result = mark_attendance_bulk(records=[item], x_idempotency_key=None, db=db, current_user=user)
        assert result.created == 1
        for call in db.add.call_args_list:
            assert call.args[0].__class__.__name__ != "AttendanceBatch"


class TestTeacherRosterFilter:
    def _profile(self):
        profile = MagicMock()
        profile.id = "teacher-1"
        return profile

    def _user(self):
        user = MagicMock()
        user.id = "user-1"
        user.school_id = "school-1"
        return user

    def test_no_filters_returns_all_assigned(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = self._profile()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_my_students(section_id=None, subject_id=None, db=db, current_user=self._user())
        assert result == []

    def test_section_not_assigned_raises_403(self):
        db = MagicMock()
        # profile lookup first(), then section-ownership first() -> None
        db.query.return_value.filter.return_value.first.side_effect = [self._profile(), None]
        db.query.return_value.filter.return_value.all.return_value = [MagicMock(grade_id="g1")]
        with pytest.raises(HTTPException) as exc:
            get_my_students(section_id="sec-9", subject_id=None, db=db, current_user=self._user())
        assert exc.value.status_code == 403

    def test_subject_not_assigned_raises_403(self):
        db = MagicMock()
        # profile lookup first(), then subject-ownership first() -> None
        db.query.return_value.filter.return_value.first.side_effect = [self._profile(), None]
        db.query.return_value.filter.return_value.all.return_value = [MagicMock(grade_id="g1")]
        with pytest.raises(HTTPException) as exc:
            get_my_students(section_id=None, subject_id="subj-9", db=db, current_user=self._user())
        assert exc.value.status_code == 403
