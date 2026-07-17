"""Tests for student service — CRUD, search, transfer, bulk, promote."""
from unittest.mock import MagicMock, patch, ANY
from datetime import date, datetime, timezone
import pytest
from app.services import student_service


class TestCreateStudent:
    def test_create_new_student(self, patch_audit):
        db = MagicMock()
        student = student_service.create_student(
            db, "STU-00001", "Alice", "M", "Smith", "F", date(2010, 5, 10),
            grade_id="grade-1", school_id="school-1", registered_by="user-1",
        )
        assert student.student_id == "STU-00001"
        assert student.first_name == "Alice"
        assert db.add.called
        assert db.commit.called
        assert db.refresh.called

    def test_create_student_default_admission_date(self, patch_audit):
        db = MagicMock()
        with patch("app.services.student_service.date") as mock_date:
            mock_date.today.return_value = date(2026, 7, 16)
            student = student_service.create_student(
                db, "STU-00002", "Bob", "", "Jones", "M", date(2009, 3, 15),
                school_id="school-1",
            )
            assert student.admission_date == date(2026, 7, 16)

    def test_create_student_enqueues_sync(self, patch_audit):
        db = MagicMock()
        with patch("app.services.student_service.enqueue_sync") as mock_sync:
            student_service.create_student(
                db, "STU-00003", "Carol", "", "Lee", "F", date(2011, 8, 22),
                school_id="school-1", registered_by="user-1",
            )
            mock_sync.assert_called_once()

    def test_create_student_sends_notification(self, patch_audit):
        db = MagicMock()
        admin = MagicMock()
        admin.id = "admin-1"
        db.query.return_value.join.return_value.filter.return_value.all.return_value = [admin]
        with patch("app.services.communication_service.send_notification") as mock_notify:
            student_service.create_student(
                db, "STU-00004", "Dave", "", "Kim", "M", date(2010, 1, 1),
                school_id="school-1",
            )
            assert mock_notify.called


class TestGetStudent:
    def test_get_student_found(self):
        db = MagicMock()
        expected = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = expected
        result = student_service.get_student(db, "student-1")
        assert result == expected

    def test_get_student_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.get_student(db, "student-nonexistent")
        assert result is None

    def test_get_student_with_school_filter(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = student_service.get_student(db, "student-1", school_id="school-2")
        assert result is None

    def test_get_student_include_deleted(self):
        db = MagicMock()
        expected = MagicMock()
        q = db.query.return_value.filter.return_value
        q.execution_options.return_value.first.return_value = expected
        result = student_service.get_student(db, "student-1", include_deleted=True)
        assert result == expected


class TestGetStudentByStudentId:
    def test_get_by_student_id_found(self):
        db = MagicMock()
        expected = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = expected
        result = student_service.get_student_by_student_id(db, "STU-00001")
        assert result == expected

    def test_get_by_student_id_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.get_student_by_student_id(db, "STU-NONE")
        assert result is None

    def test_get_by_student_id_with_school_filter(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = student_service.get_student_by_student_id(db, "STU-00001", school_id="school-1")
        assert result is None


class TestSearchStudents:
    def test_search_no_filters(self):
        db = MagicMock()
        mock_q = MagicMock()
        db.query.return_value = mock_q
        mock_q.execution_options.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.offset.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.all.return_value = []
        result = student_service.search_students(db)
        assert result == []
        assert mock_q.order_by.called

    def test_search_with_query(self):
        db = MagicMock()
        db.or_ = MagicMock(return_value=MagicMock())
        mock_q = MagicMock()
        db.query.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.offset.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.all.return_value = [MagicMock()]
        result = student_service.search_students(db, query="Alice")
        assert len(result) == 1

    def test_search_filters(self):
        db = MagicMock()
        db.or_ = MagicMock(return_value=MagicMock())
        mock_q = MagicMock()
        db.query.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.execution_options.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.offset.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.all.return_value = []
        student_service.search_students(db, grade_id="grade-1", section_id="sec-1", status="active", school_id="school-1")
        assert mock_q.filter.call_count >= 4

    def test_search_pagination(self):
        db = MagicMock()
        mock_q = MagicMock()
        db.query.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.execution_options.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.offset.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.all.return_value = [MagicMock() for _ in range(5)]
        result = student_service.search_students(db, skip=10, limit=5)
        assert len(result) == 5

    def test_search_include_deleted(self):
        db = MagicMock()
        mock_q = MagicMock()
        db.query.return_value = mock_q
        mock_q.execution_options.return_value = mock_q
        mock_q.filter.return_value = mock_q
        mock_q.order_by.return_value = mock_q
        mock_q.offset.return_value = mock_q
        mock_q.limit.return_value = mock_q
        mock_q.all.return_value = []
        student_service.search_students(db, include_deleted=True)
        assert mock_q.execution_options.called


class TestUpdateStudent:
    def _mock_student_with_table(self):
        student = MagicMock()
        col = MagicMock()
        col.name = "first_name"
        tbl = MagicMock()
        tbl.columns = [col]
        object.__setattr__(student, '__table__', tbl)
        return student

    def test_update_student_fields(self):
        db = MagicMock()
        student = self._mock_student_with_table()
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.update_student(db, "student-1", {"first_name": "AliceUpdated"})
        assert result is not None
        assert student.first_name == "AliceUpdated"
        assert db.commit.called

    def test_update_student_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.update_student(db, "student-nonexistent", {"first_name": "X"})
        assert result is None

    def test_update_student_partial(self):
        db = MagicMock()
        student = self._mock_student_with_table()
        student.first_name = "Alice"
        student.last_name = "Smith"
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.update_student(db, "student-1", {"first_name": "Alicia"})
        assert result.first_name == "Alicia"
        assert result.last_name == "Smith"

    def test_update_student_skips_none_values(self):
        db = MagicMock()
        student = self._mock_student_with_table()
        student.first_name = "Alice"
        db.query.return_value.filter.return_value.first.return_value = student
        student_service.update_student(db, "student-1", {"first_name": None, "last_name": "Jones"})
        assert student.first_name == "Alice"
        assert student.last_name == "Jones"


class TestDeleteStudent:
    def test_delete_student_soft_delete(self):
        db = MagicMock()
        student = MagicMock()
        student.deleted_at = None
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.delete_student(db, "student-1")
        assert result is True
        assert student.deleted_at is not None
        assert db.commit.called

    def test_delete_student_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.delete_student(db, "student-nonexistent")
        assert result is False

    def test_delete_student_with_school_filter(self):
        db = MagicMock()
        student = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = student
        result = student_service.delete_student(db, "student-1", school_id="school-1", user_id="user-1")
        assert result is True


class TestTransferStudent:
    def test_transfer_student_with_section(self):
        db = MagicMock()
        student = MagicMock()
        student.grade_id = "grade-1"
        student.section_id = "sec-1"
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.transfer_student(db, "student-1", "grade-2", section_id="sec-2", reason="Promoted")
        assert result.grade_id == "grade-2"
        assert result.section_id == "sec-2"
        assert db.commit.called

    def test_transfer_student_without_section(self):
        db = MagicMock()
        student = MagicMock()
        student.grade_id = "grade-1"
        student.section_id = "sec-1"
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.transfer_student(db, "student-1", "grade-2")
        assert result.grade_id == "grade-2"
        assert result.section_id == "sec-1"

    def test_transfer_student_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.transfer_student(db, "student-nonexistent", "grade-2")
        assert result is None


class TestBulkCreateStudents:
    def test_bulk_create(self):
        db = MagicMock()
        students_data = [{"student_id": "STU-01", "first_name": "A"}, {"student_id": "STU-02", "first_name": "B"}]
        with patch("app.services.student_service.enqueue_sync"):
            result = student_service.bulk_create_students(db, students_data)
            assert len(result) == 2
            assert db.add.call_count == 2
            assert db.commit.called

    def test_bulk_create_enqueues_sync_per_student(self):
        db = MagicMock()
        students_data = [{"student_id": "STU-01", "first_name": "A", "school_id": "school-1"}]
        with patch("app.services.student_service.enqueue_sync") as mock_sync:
            student_service.bulk_create_students(db, students_data)
            assert mock_sync.called

    def test_bulk_create_empty_list(self):
        db = MagicMock()
        result = student_service.bulk_create_students(db, [])
        assert result == []


class TestPromoteStudent:
    def test_promote_student(self):
        db = MagicMock()
        student = MagicMock()
        student.grade_id = "grade-1"
        student.academic_year_id = "ay-1"
        db.query.return_value.filter.return_value.first.return_value = student
        result = student_service.promote_student(db, "student-1", "grade-2", "ay-2")
        assert result.grade_id == "grade-2"
        assert result.academic_year_id == "ay-2"
        assert db.commit.called

    def test_promote_student_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = student_service.promote_student(db, "student-nonexistent", "grade-2", "ay-2")
        assert result is None

    def test_promote_student_with_school_filter(self):
        db = MagicMock()
        student = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = student
        result = student_service.promote_student(db, "student-1", "grade-2", "ay-2", school_id="school-1")
        assert result is not None
