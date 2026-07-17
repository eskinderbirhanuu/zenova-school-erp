"""Tests for teacher service — create, assign, list, update, remove."""
from unittest.mock import MagicMock, patch, ANY
from datetime import datetime, timezone
import pytest
from app.services.teacher_service import (
    create_teacher, assign_grade, assign_section,
    remove_grade_assignment, remove_section_assignment,
    list_teachers, update_teacher_profile, get_teacher_by_user_id,
)
from app.core.exceptions import ConflictException, NotFoundException


class TestCreateTeacher:
    def test_creates_user_and_profile(self):
        db = MagicMock()
        role = MagicMock()
        role.id = "role-1"
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.first.return_value = role
        with patch("app.services.teacher_service.get_password_hash", return_value="hashed"):
            result = create_teacher(
                db, teacher_id="T-001", full_name="John Doe",
                email="john@school.com", phone="+251911111111",
                password="secret123", school_id="school-1",
            )
            assert result["user"].email == "john@school.com"
            assert result["profile"].teacher_id == "T-001"
            assert db.add.call_count >= 2
            db.commit.assert_called_once()

    def test_raises_on_duplicate_email(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing
        with pytest.raises(ConflictException, match="Email already exists"):
            create_teacher(db, teacher_id="T-001", full_name="John",
                           email="dup@school.com", phone="123", password="pwd")

    def test_raises_on_missing_role(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [None, None]
        with pytest.raises(NotFoundException, match="TEACHER role not found"):
            create_teacher(db, teacher_id="T-001", full_name="John",
                           email="john@school.com", phone="123", password="pwd")


class TestAssignGrade:
    def test_creates_new_assignment(self):
        db = MagicMock()
        assignment = MagicMock()
        assignment.teacher_id = "teacher-1"
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = assign_grade(db, "teacher-1", "grade-1", "school-1")
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_returns_existing_if_already_assigned(self):
        db = MagicMock()
        existing = MagicMock()
        existing.teacher_id = "teacher-1"
        existing.grade_id = "grade-1"
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = existing
        result = assign_grade(db, "teacher-1", "grade-1", "school-1")
        assert result == existing
        db.add.assert_not_called()


class TestAssignSection:
    def test_creates_new_assignment(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = assign_section(db, "teacher-1", "section-1")
        assert result.teacher_id == "teacher-1"
        db.add.assert_called_once()

    def test_returns_existing(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing
        result = assign_section(db, "teacher-1", "section-1")
        assert result == existing
        db.add.assert_not_called()


class TestRemoveGradeAssignment:
    def test_soft_deletes(self):
        db = MagicMock()
        assignment = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = assignment
        result = remove_grade_assignment(db, "teacher-1", "grade-1")
        assert result is True
        assert assignment.deleted_at is not None
        db.commit.assert_called_once()

    def test_returns_false_when_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = remove_grade_assignment(db, "teacher-1", "grade-1")
        assert result is False


class TestRemoveSectionAssignment:
    def test_soft_deletes(self):
        db = MagicMock()
        assignment = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = assignment
        result = remove_section_assignment(db, "teacher-1", "section-1")
        assert result is True
        assert assignment.deleted_at is not None

    def test_returns_false_when_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = remove_section_assignment(db, "teacher-1", "section-1")
        assert result is False


class TestListTeachers:
    def test_returns_teacher_list(self):
        db = MagicMock()
        user = MagicMock()
        user.full_name = "Alice"
        user.email = "alice@school.com"
        user.phone = "123"
        user.is_active = True
        profile = MagicMock()
        profile.id = "prof-1"
        profile.teacher_id = "T-001"
        profile.qualification = "MSc"
        profile.department = "Science"
        db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = [(user, profile)]
        result = list_teachers(db, "school-1")
        assert len(result) == 1
        assert result[0]["full_name"] == "Alice"
        assert result[0]["teacher_id"] == "T-001"

    def test_filters_by_school(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = []
        result = list_teachers(db, "school-1")
        assert result == []


class TestUpdateTeacherProfile:
    def test_updates_fields(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        user = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [profile, user]
        result = update_teacher_profile(
            db, "T-001", "school-1",
            full_name="New Name", qualification="PhD",
        )
        assert user.full_name == "New Name"
        assert profile.qualification == "PhD"
        db.commit.assert_called_once()

    def test_raises_when_teacher_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Teacher not found"):
            update_teacher_profile(db, "T-001", "school-1", full_name="New")

    def test_raises_when_user_not_found(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        db.query.return_value.filter.return_value.first.side_effect = [profile, None]
        with pytest.raises(NotFoundException, match="User not found"):
            update_teacher_profile(db, "T-001", "school-1", full_name="New")

    def test_raises_on_duplicate_email(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        user = MagicMock()
        user.id = "user-1"
        existing = MagicMock()
        existing.id = "user-2"
        db.query.return_value.filter.return_value.first.side_effect = [profile, user, existing]
        with pytest.raises(ConflictException, match="Email already in use"):
            update_teacher_profile(db, "T-001", "school-1", email="dup@school.com")


class TestGetTeacherByUserId:
    def test_returns_profile(self):
        db = MagicMock()
        profile = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = profile
        result = get_teacher_by_user_id(db, "user-1")
        assert result == profile

    def test_returns_none(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = get_teacher_by_user_id(db, "user-1")
        assert result is None
