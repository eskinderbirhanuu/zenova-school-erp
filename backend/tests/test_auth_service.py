"""Tests for auth_service — authentication, token management, user creation, password reset."""
import time
from unittest.mock import MagicMock, patch, ANY
from datetime import datetime, timedelta, timezone
import pytest
from app.models.user import User


@pytest.fixture
def db():
    return MagicMock()


def make_user(**kwargs):
    u = MagicMock(spec=User)
    defaults = {
        "id": "user-1",
        "email": "test@zenova.app",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False,
        "employee_id": "EMP-001",
        "phone": "+251911111111",
        "hashed_password": "$2b$12$" + "x" * 53,
        "mfa_enabled": False,
        "mfa_secret": None,
        "mfa_backup_codes": None,
        "role_id": "role-1",
        "school_id": "school-1",
        "branch_id": None,
        "last_login_at": None,
        "role": MagicMock(),
    }
    for k, v in {**defaults, **kwargs}.items():
        setattr(u, k, v)
    return u


class TestAuthenticateUser:
    def test_authenticate_by_email_success(self, db):
        from app.services.auth_service import authenticate_user
        user = make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user
        with patch("app.services.auth_service.verify_password", return_value=True):
            result = authenticate_user(db, email="test@zenova.app", password="correct-password")
        assert result is not None
        assert result.id == "user-1"

    def test_authenticate_by_employee_id_success(self, db):
        from app.services.auth_service import authenticate_user
        user = make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user
        with patch("app.services.auth_service.verify_password", return_value=True):
            result = authenticate_user(db, employee_id="EMP-001", password="correct-password")
        assert result is not None

    def test_authenticate_wrong_password(self, db):
        from app.services.auth_service import authenticate_user
        user = make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user
        with patch("app.services.auth_service.verify_password", return_value=False):
            result = authenticate_user(db, email="test@zenova.app", password="wrong-password")
        assert result is None

    def test_authenticate_user_not_found(self, db):
        from app.services.auth_service import authenticate_user
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = authenticate_user(db, email="nonexistent@test.com", password="any")
        assert result is None


class TestCreateUser:
    def test_create_user_success(self, db):
        from app.services.auth_service import create_user
        db.query.return_value.filter.return_value.first.return_value = None

        user = create_user(
            db=db, email="new@zenova.app", password="StrongP@ss1",
            full_name="New User", phone="+251911111111",
            role_id="role-1", school_id="school-1",
        )

        assert user.email == "new@zenova.app"
        assert db.add.call_count >= 1
        assert db.commit.call_count >= 1

    def test_create_user_duplicate_email(self, db):
        from app.services.auth_service import create_user
        db.query.return_value.filter.return_value.first.return_value = None

        user = create_user(db=db, email="dup@zenova.app", password="StrongP@ss1", full_name="Dup")
        assert user.email == "dup@zenova.app"


class TestTokenManagement:
    def test_create_access_token(self):
        from app.services.auth_service import create_access_token
        token = create_access_token({"sub": "user-1", "school_id": "school-1"})
        assert isinstance(token, str)
        assert len(token) > 20

    def test_create_mfa_token(self):
        from app.services.auth_service import create_mfa_token
        token = create_mfa_token({"sub": "user-1"})
        assert isinstance(token, str)

    def test_create_refresh_token(self):
        from app.services.auth_service import create_refresh_token
        token = create_refresh_token({"sub": "user-1"})
        assert isinstance(token, str)

    def test_decode_valid_token(self):
        from app.services.auth_service import create_access_token, decode_token
        token = create_access_token({"sub": "user-1", "school_id": "school-1"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-1"
        assert payload["type"] == "access"
        assert "jti" in payload
        assert "exp" in payload

    def test_decode_expired_token(self):
        from app.services.auth_service import create_access_token, decode_token
        with patch("app.services.auth_service.settings.access_token_expire_minutes", -1):
            token = create_access_token({"sub": "user-1"})
        payload = decode_token(token)
        assert payload is None

    def test_decode_invalid_token(self):
        from app.services.auth_service import decode_token
        payload = decode_token("invalid-token-string")
        assert payload is None


class TestGetUser:
    def test_get_user_by_id_found(self, db):
        from app.services.auth_service import get_user_by_id
        user = make_user()
        db.query.return_value.filter.return_value.first.return_value = user
        result = get_user_by_id(db, "user-1")
        assert result is not None
        assert result.id == "user-1"

    def test_get_user_by_id_not_found(self, db):
        from app.services.auth_service import get_user_by_id
        db.query.return_value.filter.return_value.first.return_value = None
        result = get_user_by_id(db, "nonexistent")
        assert result is None

    def test_get_user_by_email_found(self, db):
        from app.services.auth_service import get_user_by_email
        user = make_user()
        db.query.return_value.filter.return_value.first.return_value = user
        result = get_user_by_email(db, "test@zenova.app")
        assert result is not None

    def test_get_user_by_email_not_found(self, db):
        from app.services.auth_service import get_user_by_email
        db.query.return_value.filter.return_value.first.return_value = None
        result = get_user_by_email(db, "missing@test.com")
        assert result is None


class TestPasswordReset:
    def test_reset_password_success(self, db):
        from app.services.auth_service import reset_password
        user = make_user()
        db.query.return_value.filter.return_value.first.return_value = user
        with patch("app.services.auth_service.validate_password_strength", return_value=(True, "")):
            reset_password(db, "user-1", "NewStrongP@ss1")
        db.commit.assert_called_once()

    def test_reset_password_weak(self, db):
        from app.services.auth_service import reset_password
        from app.core.exceptions import BadRequestException
        with patch("app.services.auth_service.validate_password_strength", return_value=(False, "Too weak")):
            with pytest.raises(BadRequestException, match="Too weak"):
                reset_password(db, "user-1", "weak")


class TestMFARequired:
    def test_mfa_required_for_super_admin(self):
        from app.services.mfa_service import mfa_required_for_role
        assert mfa_required_for_role("SUPER_ADMIN") is True

    def test_mfa_required_for_finance(self):
        from app.services.mfa_service import mfa_required_for_role
        assert mfa_required_for_role("FINANCE") is True

    def test_mfa_not_required_for_teacher(self):
        from app.services.mfa_service import mfa_required_for_role
        assert mfa_required_for_role("TEACHER") is False

    def test_mfa_not_required_for_none(self):
        from app.services.mfa_service import mfa_required_for_role
        assert mfa_required_for_role(None) is False
