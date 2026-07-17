"""Tests for password recovery — service layer functions."""
import hashlib
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
import pytest
from app.models.password_recovery import PasswordResetRequest, RecoveryCode


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
        "is_superuser": False,
        "employee_id": "EMP-001",
        "phone": "+251911111111",
        "hashed_password": "$2b$12$" + "x" * 53,
        "role": MagicMock(),
    }
    for k, v in {**defaults, **kwargs}.items():
        setattr(u, k, v)
    return u


class TestInitiateRecovery:
    def test_initiate_by_email(self, db):
        from app.services.password_recovery_service import initiate_recovery_request
        user = make_user()
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = user

        result = initiate_recovery_request(
            db=db, identifier="test@zenova.app", reason="Forgot password",
            ip_address="192.168.1.1", user_agent="test-agent",
        )

        assert result is not None

    def test_initiate_unknown_identifier(self, db):
        from app.services.password_recovery_service import initiate_recovery_request
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = None

        result = initiate_recovery_request(db=db, identifier="unknown@test.com")

        assert result["request_id"] is None


class TestAdminGenerateTempPassword:
    def test_admin_generates_temp_password(self, db):
        from app.services.password_recovery_service import admin_generate_temp_password
        target_role = MagicMock()
        target_role.name = "TEACHER"
        target = make_user(role=target_role)
        initiator_role = MagicMock()
        initiator_role.name = "SUPER_ADMIN"
        initiator = make_user(id="admin-1", is_superuser=True, role=initiator_role)
        db.query.return_value.filter.return_value.filter.return_value.first.return_value = target

        result = admin_generate_temp_password(
            db=db, target_user_id="user-1", initiated_by_user=initiator,
            reason="User locked out",
        )

        assert result is not None

    def test_admin_generate_target_not_found(self, db):
        from app.services.password_recovery_service import admin_generate_temp_password
        from app.core.exceptions import NotFoundException
        from app.models.user import User
        initiator = make_user(id="admin-1", is_superuser=True)
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(NotFoundException):
            admin_generate_temp_password(db=db, target_user_id="nonexistent", initiated_by_user=initiator)


class TestRecoveryCodes:
    def test_generate_recovery_codes(self, db):
        from app.services.password_recovery_service import generate_recovery_codes
        user = make_user()
        codes = generate_recovery_codes(db, user=user, count=5, ip_address="10.0.0.1")
        assert len(codes) == 5
        for c in codes:
            assert len(c) >= 6

    def test_verify_valid_recovery_code(self, db):
        from app.services.password_recovery_service import verify_recovery_code
        code_value = "ABCD-1234-EFGH"
        code_hash = hashlib.sha256(code_value.encode()).hexdigest()
        rc = MagicMock(spec=RecoveryCode)
        rc.code_hash = code_hash
        rc.is_used = False
        rc.user_id = "user-1"
        rc.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        db.query.return_value.filter.return_value.first.return_value = rc

        result = verify_recovery_code(db, code=code_value, user_id="user-1", ip_address="10.0.0.1")
        assert result is True
        assert rc.is_used is True

    def test_verify_invalid_code(self, db):
        from app.services.password_recovery_service import verify_recovery_code
        db.query.return_value.filter.return_value.first.return_value = None

        result = verify_recovery_code(db, code="invalid-code", user_id="user-1", ip_address="10.0.0.1")
        assert result is False


class TestAuditLog:
    def test_list_audit_log(self, db):
        from app.services.password_recovery_service import list_audit_log
        from app.models.password_recovery import PasswordAudit
        log_entry = MagicMock(spec=PasswordAudit)
        log_entry.id = "log-1"
        log_entry.action = "password_reset"
        log_entry.target_user_id = "user-1"
        db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [log_entry]
        db.query.return_value.filter.return_value.count.return_value = 1

        result = list_audit_log(db, target_user_id="user-1", action=None, limit=10, offset=0)
        assert len(result) > 0
