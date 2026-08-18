"""
Regression tests — license authority endpoints served by org (super-admin)
deployments so school servers can verify licenses against the org.

Found in production (2026-08-18): school server import was blocked
("View only mode. Cannot use import without a valid license") because the
cloud license check (`{ZENOVA_LICENSE_SERVER}/api/v1/license/school-verify`)
404'd against the org — the org backend never served the license-authority
contract that the standalone license-server project provides.
"""
import pytest
from unittest.mock import MagicMock, patch


class TestLicenseAuthority:
    def test_ping_returns_ok(self):
        from app.api.v1.endpoints.license_authority import license_ping
        assert license_ping() == {"status": "ok"}

    def test_school_verify_valid_key(self):
        from app.api.v1.endpoints.license_authority import license_school_verify
        from app.api.v1.endpoints.license_authority import SchoolVerifyRequest

        db = MagicMock()
        lic = MagicMock()
        lic.valid_until = None
        lic.max_users = 100
        lic.status = MagicMock()
        lic.status.value = "active"
        db.query.return_value.filter.return_value.first.return_value = lic

        with patch(
            "app.api.v1.endpoints.license_authority.license_service.verify_license",
            return_value={"valid": True, "license_type": "main", "message": "ok"},
        ):
            result = license_school_verify(
                SchoolVerifyRequest(key="ZNV-AAAA-1111-BBBB-2222", machine_fingerprint="fp-001"),
                db=db,
            )
        assert result.valid is True
        assert result.status == "active"
        assert result.max_users == 100

    def test_school_verify_invalid_key(self):
        from app.api.v1.endpoints.license_authority import license_school_verify
        from app.api.v1.endpoints.license_authority import SchoolVerifyRequest

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = license_school_verify(
            SchoolVerifyRequest(key="NOPE-1234", machine_fingerprint="fp-001"),
            db=db,
        )
        assert result.valid is False

    def test_school_verify_uses_license_service(self):
        """The endpoint must delegate to license_service.verify_license."""
        from app.api.v1.endpoints.license_authority import license_school_verify
        from app.api.v1.endpoints.license_authority import SchoolVerifyRequest

        db = MagicMock()
        lic = MagicMock()
        lic.valid_until = None
        lic.max_users = None
        lic.status = MagicMock()
        lic.status.value = "active"
        db.query.return_value.filter.return_value.first.return_value = lic

        with patch(
            "app.api.v1.endpoints.license_authority.license_service.verify_license",
            return_value={"valid": True, "license_type": "main", "message": "ok"},
        ) as m:
            result = license_school_verify(
                SchoolVerifyRequest(key="ZNV-AAAA-1111-BBBB-2222"),
                db=db,
            )
            m.assert_called_once_with(db, "ZNV-AAAA-1111-BBBB-2222")
        assert result.license_type == "main"

    def test_heartbeat_accepts_school_ping(self):
        from app.api.v1.endpoints.license_authority import license_heartbeat
        from app.api.v1.endpoints.license_authority import HeartbeatPayload

        result = license_heartbeat(
            HeartbeatPayload(
                server_id="SRV-TEST-0001",
                school_code="ETA82444",
                server_role="MAIN_SCHOOL",
                version="1.0.0",
                license_key="ZNV-AAAA-1111-BBBB-2222",
            ),
            request=MagicMock(),
        )
        assert result["status"] == "ok"

    def test_heartbeat_rejects_bad_hmac(self):
        from app.api.v1.endpoints.license_authority import license_heartbeat
        from app.api.v1.endpoints.license_authority import HeartbeatPayload

        with patch("app.api.v1.endpoints.license_authority.settings") as m:
            m.sync_secret = "test-secret"
            result = license_heartbeat(
                HeartbeatPayload(server_id="SRV-X", school_code="ETA82444"),
                request=MagicMock(),
                x_server_id="SRV-X",
                x_hmac_signature="deadbeef",
            )
        assert result["status"] == "rejected"