"""Tests for MFA service — TOTP setup, verification, backup codes, disable."""
import json
from unittest.mock import MagicMock, patch, ANY
from datetime import datetime, timezone
import pytest


@pytest.fixture
def db():
    return MagicMock()


def make_user(**kwargs):
    u = MagicMock()
    defaults = {
        "id": "user-1",
        "email": "test@zenova.app",
        "full_name": "Test User",
        "is_active": True,
        "mfa_enabled": False,
        "mfa_secret": None,
        "mfa_backup_codes": None,
    }
    for k, v in {**defaults, **kwargs}.items():
        setattr(u, k, v)
    return u


class TestMfaSetup:
    def test_initiate_mfa_setup(self, db):
        from app.services.mfa_service import initiate_mfa_setup
        user = make_user()

        result = initiate_mfa_setup(db, user)

        assert "secret" in result
        assert "qr_code_url" in result
        assert user.mfa_secret is not None
        assert user.mfa_enabled is False  # not yet enabled

    def test_complete_mfa_setup_success(self, db):
        from app.services.mfa_service import initiate_mfa_setup, complete_mfa_setup
        user = make_user()
        setup = initiate_mfa_setup(db, user)
        secret = setup["secret"]

        with patch("app.services.mfa_service.verify_totp", return_value=True):
            result = complete_mfa_setup(db, user, "123456")

        assert result is not None
        assert "backup_codes" in result
        assert len(result["backup_codes"]) == 10
        assert user.mfa_enabled is True

    def test_complete_mfa_setup_invalid_code(self, db):
        from app.services.mfa_service import initiate_mfa_setup, complete_mfa_setup
        user = make_user()
        initiate_mfa_setup(db, user)

        with patch("app.services.mfa_service.verify_totp", return_value=False):
            result = complete_mfa_setup(db, user, "000000")

        assert result is None
        assert user.mfa_enabled is False

    def test_complete_mfa_setup_no_secret(self, db):
        from app.services.mfa_service import complete_mfa_setup
        user = make_user(mfa_secret=None)
        result = complete_mfa_setup(db, user, "123456")
        assert result is None


class TestMfaVerification:
    def test_verify_totp_valid(self):
        from app.services.mfa_service import verify_totp
        with patch("app.services.mfa_service.pyotp.TOTP.verify", return_value=True):
            assert verify_totp("SECRETKEY", "123456") is True

    def test_verify_totp_invalid(self):
        from app.services.mfa_service import verify_totp
        with patch("app.services.mfa_service.pyotp.TOTP.verify", return_value=False):
            assert verify_totp("SECRETKEY", "000000") is False

    def test_verify_mfa_code_totp(self):
        from app.services.mfa_service import verify_mfa_code
        user = make_user(mfa_secret="SECRETKEY")
        with patch("app.services.mfa_service.verify_totp", return_value=True):
            assert verify_mfa_code(user, "123456") is True

    def test_verify_mfa_code_no_secret(self):
        from app.services.mfa_service import verify_mfa_code
        user = make_user(mfa_secret=None)
        assert verify_mfa_code(user, "123456") is False

    def test_verify_backup_code_valid(self):
        from app.services.mfa_service import verify_backup_code
        import hashlib
        code = "ABCD1234"
        hashed = hashlib.sha256(code.encode()).hexdigest()
        user = make_user(mfa_backup_codes=json.dumps([hashed]))
        assert verify_backup_code(user, code) is True

    def test_verify_backup_code_invalid(self):
        from app.services.mfa_service import verify_backup_code
        import hashlib
        code = "WRONGCODE"
        hashed = hashlib.sha256(code.encode()).hexdigest()
        user = make_user(mfa_backup_codes=json.dumps([hashed]))
        assert verify_backup_code(user, "DIFFERENT") is False

    def test_verify_backup_code_no_codes(self):
        from app.services.mfa_service import verify_backup_code
        user = make_user(mfa_backup_codes=None)
        assert verify_backup_code(user, "ABCD1234") is False


class TestMfaDisable:
    def test_disable_mfa(self, db):
        from app.services.mfa_service import disable_mfa
        user = make_user(mfa_enabled=True, mfa_secret="SECRET", mfa_backup_codes='["hash1"]')
        disable_mfa(db, user)
        assert user.mfa_enabled is False
        assert user.mfa_secret is None
        assert user.mfa_backup_codes is None
        db.commit.assert_called_once()

    def test_regenerate_backup_codes(self, db):
        from app.services.mfa_service import regenerate_backup_codes
        user = make_user(mfa_enabled=True, mfa_backup_codes='["oldhash"]')
        codes = regenerate_backup_codes(db, user)
        assert len(codes) == 10
        assert user.mfa_backup_codes is not None
        db.commit.assert_called_once()
