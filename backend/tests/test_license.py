"""Tests for license management — verify, create, activate, status."""
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta, timezone
import pytest
from app.models.license import License, LicenseType, LicenseStatus

LEGACY_KEY = "ZNV-AAAA-AAAA-AAAA-AAAA"


@pytest.fixture
def db():
    return MagicMock()


def _make_license(**kwargs):
    lic = MagicMock(spec=License)
    for k, v in {
        "id": "lic-1",
        "key": LEGACY_KEY,
        "license_type": LicenseType.MAIN,
        "status": LicenseStatus.ACTIVE,
        "valid_from": datetime.now(timezone.utc) - timedelta(days=30),
        "valid_until": datetime.now(timezone.utc) + timedelta(days=335),
        "max_users": 1000,
        "school_id": "school-1",
    }.items():
        setattr(lic, k, kwargs.get(k, v))
    return lic


class TestVerifyLicense:
    def test_verify_returns_valid(self, db):
        from app.services.license_service import verify_license
        lic = _make_license()
        db.query.return_value.filter.return_value.first.return_value = lic

        result = verify_license(db, LEGACY_KEY)

        assert result["valid"] is True
        assert result["license_type"] == LicenseType.MAIN.value

    def test_verify_key_not_found(self, db):
        from app.services.license_service import verify_license
        db.query.return_value.filter.return_value.first.return_value = None

        result = verify_license(db, "SAL-AAAA-AAAA-AAAA")

        assert result["valid"] is False

    def test_verify_expired_license(self, db):
        from app.services.license_service import verify_license
        lic = _make_license(valid_until=datetime.now(timezone.utc) - timedelta(days=1))
        db.query.return_value.filter.return_value.first.return_value = lic

        result = verify_license(db, LEGACY_KEY)

        assert result["valid"] is False

    def test_verify_suspended_license(self, db):
        from app.services.license_service import verify_license
        lic = _make_license(status=LicenseStatus.SUSPENDED)
        db.query.return_value.filter.return_value.first.return_value = lic

        result = verify_license(db, LEGACY_KEY)

        assert result["valid"] is False


class TestActivateLicense:
    @patch("app.services.license_crypto.bind_license_to_hardware")
    @patch("app.services.license_crypto.invalidate_license_cache")
    @patch("app.services.license_service.log_audit")
    def test_activate_success(self, mock_audit, mock_invalidate, mock_bind, db):
        from app.services.license_service import activate_license
        lic = _make_license(school_id=None, status=LicenseStatus.REVOKED)
        school = MagicMock()
        db.query.return_value.filter.return_value.first.side_effect = [lic, school]

        result = activate_license(db, LEGACY_KEY, "school-1", user_id="user-1")

        assert result["activated"] is True

    def test_activate_already_active(self, db):
        from app.services.license_service import activate_license
        lic = _make_license(status=LicenseStatus.ACTIVE)
        db.query.return_value.filter.return_value.first.return_value = lic

        result = activate_license(db, LEGACY_KEY, "school-1", user_id="user-1")

        assert result["activated"] is False


class TestLicenseStatus:
    def test_get_license_status_returns_expected_fields(self, db):
        from app.services.license_service import get_license_status
        lic = _make_license()
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = lic

        result = get_license_status(db, "school-1")

        assert result is not None
        assert result.key == LEGACY_KEY
        assert result.license_type == LicenseType.MAIN
        assert result.status == LicenseStatus.ACTIVE

    def test_get_license_status_no_license_returns_none(self, db):
        from app.services.license_service import get_license_status
        db.query.return_value.filter.return_value.order_by.return_value.first.return_value = None

        result = get_license_status(db, "school-nonexistent")

        assert result is None
