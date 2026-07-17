"""Tests for staff service — create, list, get, update, deactivate."""
from unittest.mock import MagicMock, patch, ANY
from datetime import datetime, timezone
import pytest
from app.services.staff_service import (
    create_staff, list_staff, get_staff_by_user_id,
    get_staff_by_id, update_staff, deactivate_staff,
)
from app.core.exceptions import NotFoundException, ConflictException, BadRequestException


class TestCreateStaff:
    def test_creates_user_and_profile(self):
        db = MagicMock()
        role = MagicMock()
        role.id = "role-1"
        db.query.return_value.filter.return_value.first.side_effect = [None, role]
        with patch("app.services.staff_service.get_password_hash", return_value="hashed"):
            result = create_staff(
                db, staff_id="S-001", full_name="Jane Staff",
                email="jane@school.com", phone="+251911111111",
                role_name="FINANCE", password="secret123",
                school_id="school-1",
            )
            assert result["user"].email == "jane@school.com"
            assert result["profile"].staff_id == "S-001"
            assert db.add.call_count >= 2
            db.commit.assert_called_once()

    def test_raises_on_invalid_role(self):
        db = MagicMock()
        with pytest.raises(BadRequestException, match="Invalid staff role"):
            create_staff(db, staff_id="S-001", full_name="J", email="j@j.com",
                         phone="123", role_name="BAD_ROLE", password="pwd")

    def test_raises_on_duplicate_email(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing
        with pytest.raises(ConflictException, match="Email already exists"):
            create_staff(db, staff_id="S-001", full_name="J", email="dup@j.com",
                         phone="123", role_name="FINANCE", password="pwd")

    def test_raises_on_missing_role(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [None, None]
        with pytest.raises(NotFoundException, match="role not found"):
            create_staff(db, staff_id="S-001", full_name="J", email="j@j.com",
                         phone="123", role_name="FINANCE", password="pwd")


class TestListStaff:
    def test_returns_staff_list(self):
        db = MagicMock()
        user = MagicMock()
        user.full_name = "Bob"
        user.email = "bob@school.com"
        user.phone = "123"
        user.is_active = True
        user.role_id = "role-1"
        profile = MagicMock()
        profile.id = "prof-1"
        profile.staff_id = "S-001"
        profile.department = "Finance"
        role = MagicMock()
        role.id = "role-1"
        role.name = "FINANCE"
        db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = [(user, profile)]
        db.query.return_value.filter.return_value.all.return_value = [role]
        result = list_staff(db, school_id="school-1")
        assert len(result) == 1
        assert result[0]["full_name"] == "Bob"
        assert result[0]["role_name"] == "FINANCE"

    def test_filters_by_role(self):
        db = MagicMock()
        role = MagicMock()
        role.id = "role-2"
        role.name = "HR"
        db.query.return_value.join.return_value.filter.return_value.filter.return_value.filter.return_value.all.return_value = []
        db.query.return_value.filter.return_value.first.return_value = role
        result = list_staff(db, school_id="school-1", role_name="HR")
        assert result == []

    def test_empty_when_no_rows(self):
        db = MagicMock()
        db.query.return_value.join.return_value.filter.return_value.filter.return_value.all.return_value = []
        result = list_staff(db, school_id="school-1")
        assert result == []


class TestGetStaffByUserId:
    def test_returns_profile(self):
        db = MagicMock()
        profile = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = profile
        result = get_staff_by_user_id(db, "user-1")
        assert result == profile

    def test_returns_none(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = get_staff_by_user_id(db, "user-1")
        assert result is None


class TestGetStaffById:
    def test_returns_full_dict(self):
        db = MagicMock()
        profile = MagicMock()
        profile.id = "prof-1"
        profile.staff_id = "S-001"
        profile.department = "IT"
        profile.employment_date = "2026-01-01"
        user = MagicMock()
        user.id = "user-1"
        user.full_name = "Alice"
        user.email = "alice@school.com"
        user.phone = "123"
        user.photo_url = "photo.jpg"
        user.is_active = True
        user.created_at = "2026-01-01"
        role = MagicMock()
        role.name = "REGISTRAR"
        db.query.return_value.filter.return_value.first.side_effect = [profile, user, role]
        result = get_staff_by_id(db, "prof-1", "school-1")
        assert result["staff_id"] == "S-001"
        assert result["role_name"] == "REGISTRAR"

    def test_returns_none_when_profile_missing(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        result = get_staff_by_id(db, "prof-1", "school-1")
        assert result is None

    def test_returns_none_when_user_missing(self):
        db = MagicMock()
        profile = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [profile, None]
        result = get_staff_by_id(db, "prof-1", "school-1")
        assert result is None


class TestUpdateStaff:
    def test_updates_fields(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        user = MagicMock()
        role = MagicMock()
        role.name = "HR"
        db.query.return_value.filter.return_value.first.side_effect = [profile, user, None, role]
        data = MagicMock()
        data.full_name = "New Name"
        data.email = None
        data.phone = "999"
        data.photo_url = None
        data.department = "HR Dept"
        data.employment_date = "2026-07-01"
        result = update_staff(db, "prof-1", "school-1", data, "user-1")
        assert user.full_name == "New Name"
        assert profile.department == "HR Dept"
        db.commit.assert_called_once()

    def test_raises_on_profile_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        data = MagicMock()
        with pytest.raises(NotFoundException, match="Staff not found"):
            update_staff(db, "prof-1", "school-1", data, "user-1")

    def test_raises_on_user_not_found(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        db.query.return_value.filter.return_value.first.side_effect = [profile, None]
        data = MagicMock()
        with pytest.raises(NotFoundException, match="Staff not found in this school"):
            update_staff(db, "prof-1", "school-1", data, "user-1")

    def test_raises_on_duplicate_email(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        user = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [profile, user, existing]
        data = MagicMock()
        data.full_name = None
        data.email = "dup@school.com"
        data.phone = None
        data.photo_url = None
        data.department = None
        data.employment_date = None
        with pytest.raises(ConflictException, match="Email already in use"):
            update_staff(db, "prof-1", "school-1", data, "user-1")


class TestDeactivateStaff:
    def test_deactivates_user(self):
        db = MagicMock()
        profile = MagicMock()
        profile.user_id = "user-1"
        user = MagicMock()
        user.full_name = "Bob"
        db.query.return_value.filter.return_value.first.side_effect = [profile, user]
        result = deactivate_staff(db, "prof-1", "school-1", "user-1")
        assert user.is_active is False
        assert result["ok"] is True
        db.commit.assert_called_once()

    def test_raises_on_profile_not_found(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        with pytest.raises(NotFoundException, match="Staff not found"):
            deactivate_staff(db, "prof-1", "school-1", "user-1")

    def test_raises_on_user_not_found(self):
        db = MagicMock()
        profile = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [profile, None]
        with pytest.raises(NotFoundException, match="Staff not found in this school"):
            deactivate_staff(db, "prof-1", "school-1", "user-1")
