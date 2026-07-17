"""Tests for license_service — school, branch, and setup operations."""
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
import pytest
from app.models.license import License, LicenseType, LicenseStatus


@pytest.fixture
def db():
    return MagicMock()


class TestCreateSchool:
    def test_create_school_success(self, db):
        from app.services.license_service import create_school
        db.query.return_value.filter.return_value.first.return_value = None

        school = create_school(db, name="Test School", code="TS001",
                               address="123 Main St", phone="+251911111111",
                               email="school@test.com")

        assert school.name == "Test School"
        assert school.code == "TS001"
        assert db.add.call_count >= 1
        assert db.commit.call_count >= 1

    def test_create_school_duplicate_code(self, db):
        from app.services.license_service import create_school
        from app.core.exceptions import ConflictException
        existing = MagicMock()
        existing.code = "TS001"
        db.query.return_value.filter.return_value.first.return_value = existing

        with pytest.raises(ConflictException, match="code"):
            create_school(db, name="Dup School", code="TS001")


class TestCreateBranch:
    def test_create_branch_success(self, db):
        from app.services.license_service import create_branch
        school = MagicMock()
        school.id = "school-1"
        db.query.return_value.filter.return_value.first.return_value = school

        branch = create_branch(db, school_id="school-1", name="Main Branch",
                               code="MB-01", address="456 Oak St")

        assert branch.name == "Main Branch"
        assert branch.code == "MB-01"
        assert branch.school_id == "school-1"

    def test_create_branch_school_not_found(self, db):
        from app.services.license_service import create_branch
        from app.core.exceptions import NotFoundException
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(NotFoundException, match="School not found"):
            create_branch(db, school_id="nonexistent", name="Branch", code="BR-01")


class TestInitializeSystem:
    def test_initialize_system_already_setup(self, db):
        from app.services.license_service import initialize_system
        existing = MagicMock()
        existing.is_setup_complete = True
        db.query.return_value.filter.return_value.first.return_value = existing

        result = initialize_system(db, main_key="M-KEY", branch_key="B-KEY",
                                   school_name="School", school_code="SC-001")
        assert result["success"] is False

    def test_ensure_default_roles(self, db):
        from app.services.license_service import ensure_default_roles
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.all.return_value = []

        roles = ensure_default_roles(db)

        assert isinstance(roles, dict)
        assert len(roles) > 0


class TestLicenseKeyFormat:
    def test_verify_legacy_format(self):
        from app.services.license_service import verify_license_key_format
        assert verify_license_key_format("ZNV-AAAA-AAAA-AAAA-AAAA") is True

    def test_verify_v2_format(self):
        from app.services.license_service import verify_license_key_format, generate_license_key_v2
        key = generate_license_key_v2("M")
        assert verify_license_key_format(key) is True

    def test_verify_invalid_format(self):
        from app.services.license_service import verify_license_key_format
        assert verify_license_key_format("INVALID-KEY-FORMAT") is False
        assert verify_license_key_format("") is False
