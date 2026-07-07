"""Tests for license management — verify, create, activate, status."""
import json
import base64
from unittest.mock import MagicMock, patch, ANY
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
        "machine_fingerprint": None,
        "hardware_id": None,
        "tpm_sealed_data": None,
        "runtime_environment": None,
        "offline_grace_start": None,
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


class TestFingerprintBinding:
    """Tests for 75% hardware fingerprint matching and component storage."""

    def test_encode_decode_hardware_components_roundtrip(self):
        from app.services.license_crypto import (
            encode_hardware_components, decode_hardware_components,
        )
        components = {
            "mac": "00:11:22:33:44:55",
            "cpu_serial": "ABC123",
            "machine_id": "machine-id-123",
            "disk_serial": "DISK-SN-456",
            "hostname": "server-01",
            "os_version": "Linux-5.10.0",
            "dmi_uuid": "dmi-uuid-789",
            "boot_id": "boot-id-abc",
        }
        encoded = encode_hardware_components(components)
        decoded = decode_hardware_components(encoded)
        assert decoded == components

    def test_match_fingerprint_components_exact_match(self):
        from app.services.license_crypto import (
            encode_hardware_components, match_fingerprint_components,
            FINGERPRINT_COMPONENT_NAMES,
        )
        components = {k: f"val-{i}" for i, k in enumerate(FINGERPRINT_COMPONENT_NAMES)}
        encoded = encode_hardware_components(components)

        with patch("app.services.license_crypto._collect_fingerprint_components", return_value=components):
            is_match, match_count, total = match_fingerprint_components(encoded)

        assert is_match is True
        assert match_count == total
        assert total == 8

    def test_match_fingerprint_components_6_of_8_passes(self):
        from app.services.license_crypto import (
            encode_hardware_components, match_fingerprint_components,
            FINGERPRINT_COMPONENT_NAMES,
        )
        stored = {k: f"val-{i}" for i, k in enumerate(FINGERPRINT_COMPONENT_NAMES)}
        current = dict(stored)
        current["mac"] = "different-mac"
        current["cpu_serial"] = "different-cpu"
        encoded = encode_hardware_components(stored)

        with patch("app.services.license_crypto._collect_fingerprint_components", return_value=current):
            is_match, match_count, total = match_fingerprint_components(encoded)

        assert is_match is True
        assert match_count == 6
        assert total == 8

    def test_match_fingerprint_components_5_of_8_fails(self):
        from app.services.license_crypto import (
            encode_hardware_components, match_fingerprint_components,
            FINGERPRINT_COMPONENT_NAMES,
        )
        stored = {k: f"val-{i}" for i, k in enumerate(FINGERPRINT_COMPONENT_NAMES)}
        current = dict(stored)
        current["mac"] = "x"
        current["cpu_serial"] = "x"
        current["machine_id"] = "x"
        encoded = encode_hardware_components(stored)

        with patch("app.services.license_crypto._collect_fingerprint_components", return_value=current):
            is_match, match_count, total = match_fingerprint_components(encoded)

        assert is_match is False
        assert match_count == 5
        assert total == 8

    def test_bind_license_to_hardware_stores_both_fields(self):
        from app.services.license_crypto import (
            bind_license_to_hardware, get_machine_fingerprint,
        )
        lic = MagicMock(spec=License)
        lic.machine_fingerprint = None
        lic.hardware_id = None
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        bind_license_to_hardware(db, "lic-1")

        assert lic.machine_fingerprint == get_machine_fingerprint()
        assert lic.hardware_id is not None
        assert len(lic.hardware_id) > 20
        db.commit.assert_called_once()

    def test_bind_license_skips_if_already_bound(self):
        from app.services.license_crypto import bind_license_to_hardware
        lic = MagicMock(spec=License)
        lic.machine_fingerprint = "existing-hash"
        lic.hardware_id = "existing-encoded"
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        bind_license_to_hardware(db, "lic-1")

        assert lic.machine_fingerprint == "existing-hash"
        db.commit.assert_not_called()

    def test_hardware_id_contains_all_8_components(self):
        from app.services.license_crypto import (
            bind_license_to_hardware, decode_hardware_components,
            FINGERPRINT_COMPONENT_NAMES,
        )
        lic = MagicMock(spec=License)
        lic.machine_fingerprint = None
        lic.hardware_id = None
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        bind_license_to_hardware(db, "lic-1")

        decoded = decode_hardware_components(lic.hardware_id)
        for key in FINGERPRINT_COMPONENT_NAMES:
            assert key in decoded, f"Missing component: {key}"

    def test_validate_lic_file_uses_75_percent_matching(self):
        from app.services.license_validator import validate_lic_file
        from app.services.license_crypto import (
            encode_hardware_components, FINGERPRINT_COMPONENT_NAMES,
        )

        stored = {k: f"val-{i}" for i, k in enumerate(FINGERPRINT_COMPONENT_NAMES)}
        current = dict(stored)
        current["mac"] = "different-mac"
        current["cpu_serial"] = "different-cpu"

        lic = MagicMock(spec=License)
        lic.machine_fingerprint = "some-hash"
        lic.hardware_id = encode_hardware_components(stored)
        lic.id = "lic-1"
        lic.school_id = "school-1"

        payload = {
            "machine_fingerprint": "some-hash",
            "school_id": "school-1",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        }

        with (
            patch("app.services.license_validator.read_lic_file", return_value="fake-lic"),
            patch("app.services.license_validator.verify_license_file", return_value=payload),
            patch("app.services.license_validator.get_machine_fingerprint", return_value="some-hash"),
            patch("app.services.license_crypto._collect_fingerprint_components", return_value=current),
            patch("app.services.license_validator.SessionLocal") as mock_session,
        ):
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            mock_db.query.return_value.filter.return_value.first.return_value = lic

            result = validate_lic_file()

        assert result.valid is True
        assert result.restrict_nfc is False

    def test_validate_lic_file_rejects_5_of_8_match(self):
        from app.services.license_validator import validate_lic_file
        from app.services.license_crypto import (
            encode_hardware_components, FINGERPRINT_COMPONENT_NAMES,
        )

        stored = {k: f"val-{i}" for i, k in enumerate(FINGERPRINT_COMPONENT_NAMES)}
        current = dict(stored)
        current["mac"] = "x"
        current["cpu_serial"] = "x"
        current["machine_id"] = "x"

        lic = MagicMock(spec=License)
        lic.machine_fingerprint = "some-hash"
        lic.hardware_id = encode_hardware_components(stored)
        lic.id = "lic-1"
        lic.school_id = "school-1"

        payload = {
            "machine_fingerprint": "some-hash",
            "school_id": "school-1",
            "valid_until": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
        }

        with (
            patch("app.services.license_validator.read_lic_file", return_value="fake-lic"),
            patch("app.services.license_validator.verify_license_file", return_value=payload),
            patch("app.services.license_validator.get_machine_fingerprint", return_value="some-hash"),
            patch("app.services.license_crypto._collect_fingerprint_components", return_value=current),
            patch("app.services.license_validator.SessionLocal") as mock_session,
        ):
            mock_db = MagicMock()
            mock_session.return_value = mock_db
            mock_db.query.return_value.filter.return_value.first.return_value = lic

            result = validate_lic_file()

        assert result.valid is False
        assert "5/8" in result.message


class TestEnvironmentDetection:
    """Tests for VM/Docker/bare-metal environment detection."""

    def test_detect_environment_default(self):
        from app.services.license_crypto import detect_environment
        env = detect_environment()
        assert env in ("bare_metal", "vm", "docker", "unknown")

    def test_environment_grace_days_valid(self):
        from app.services.license_crypto import get_environment_grace_days
        assert get_environment_grace_days("bare_metal") == 45
        assert get_environment_grace_days("vm") == 30
        assert get_environment_grace_days("docker") == 15
        assert get_environment_grace_days("unknown") == 7

    def test_environment_grace_days_default(self):
        from app.services.license_crypto import get_environment_grace_days
        assert get_environment_grace_days("nonexistent") == 7

    def test_get_active_environment_cached(self):
        from app.services.license_crypto import get_active_environment

        # Clear the cached value
        if hasattr(get_active_environment, "_cached"):
            delattr(get_active_environment, "_cached")

        with patch("app.services.license_crypto.detect_environment", return_value="vm") as mock_detect:
            env1 = get_active_environment()
            env2 = get_active_environment()

        assert env1 == "vm"
        assert env2 == "vm"
        mock_detect.assert_called_once()

    def test_get_effective_fingerprint_components_bare_metal(self):
        from app.services.license_crypto import get_effective_fingerprint_components
        comp = get_effective_fingerprint_components("bare_metal")
        assert len(comp) == 8
        assert "mac" in comp and "cpu_serial" in comp

    def test_get_effective_fingerprint_components_vm(self):
        from app.services.license_crypto import get_effective_fingerprint_components
        comp = get_effective_fingerprint_components("vm")
        assert len(comp) == 2
        assert "machine_id" in comp
        assert "disk_serial" in comp

    def test_get_effective_fingerprint_components_docker(self):
        from app.services.license_crypto import get_effective_fingerprint_components
        comp = get_effective_fingerprint_components("docker")
        assert len(comp) == 1
        assert "machine_id" in comp

    def test_bind_license_to_hardware_stores_environment(self):
        from app.services.license_crypto import bind_license_to_hardware, get_active_environment

        lic = MagicMock(spec=License)
        lic.machine_fingerprint = None
        lic.hardware_id = None
        lic.runtime_environment = None
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        bind_license_to_hardware(db, "lic-1")

        assert lic.runtime_environment in ("bare_metal", "vm", "docker", "unknown")
        db.commit.assert_called_once()


class TestTpmService:
    """Tests for TPM detection and software fallback sealing."""

    def test_is_tpm_available_returns_bool(self):
        from app.services.tpm_service import is_tpm_available
        result = is_tpm_available()
        assert isinstance(result, bool)

    def test_seal_unseal_software_roundtrip(self):
        from app.services.tpm_service import seal_license_data, unseal_license_data

        with patch("app.services.tpm_service.is_tpm_available", return_value=False):
            sealed = seal_license_data("test-license-data-123")

        assert sealed.startswith("sw1:")

        with patch("app.services.tpm_service.is_tpm_available", return_value=False):
            unsealed = unseal_license_data(sealed)

        assert unsealed == "test-license-data-123"

    def test_unseal_wrong_prefix_returns_none(self):
        from app.services.tpm_service import unseal_license_data
        result = unseal_license_data("invalid-format")
        assert result is None

    def test_unseal_software_wrong_machine_returns_none(self):
        from app.services.tpm_service import seal_license_data, unseal_license_data

        with patch("app.services.tpm_service.is_tpm_available", return_value=False):
            sealed = seal_license_data("secret-data")

        orig_fingerprint = "app.services.license_crypto.get_machine_fingerprint"
        with patch(orig_fingerprint, return_value="different-machine-fingerprint-not-matching"):
            result = unseal_license_data(sealed)

        assert result is None

    def test_seal_uses_tpm_when_available(self):
        from app.services.tpm_service import seal_license_data

        with patch("app.services.tpm_service.is_tpm_available", return_value=True):
            with patch("app.services.tpm_service._tpm_seal", return_value=b"tpm-sealed-bytes"):
                sealed = seal_license_data("test")

        assert sealed.startswith("tpm1:")


class TestTpmIntegration:
    """Tests for TPM sealing integration into binding and validation."""

    def test_bind_license_to_hardware_stores_tpm_sealed_data(self):
        from app.services.license_crypto import bind_license_to_hardware

        lic = MagicMock(spec=License)
        lic.id = "lic-tpm-1"
        lic.machine_fingerprint = None
        lic.hardware_id = None
        lic.runtime_environment = None
        lic.tpm_sealed_data = None

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        with patch("app.services.tpm_service.seal_license_data", return_value="sw1:test-sealed-data"):
            bind_license_to_hardware(db, "lic-tpm-1")

        assert lic.tpm_sealed_data == "sw1:test-sealed-data"

    def test_bind_license_to_hardware_handles_seal_failure_gracefully(self):
        from app.services.license_crypto import bind_license_to_hardware

        lic = MagicMock(spec=License)
        lic.id = "lic-tpm-2"
        lic.machine_fingerprint = None
        lic.hardware_id = None
        lic.runtime_environment = None
        lic.tpm_sealed_data = None

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        with patch("app.services.tpm_service.seal_license_data", side_effect=Exception("seal failed")):
            bind_license_to_hardware(db, "lic-tpm-2")

        assert lic.tpm_sealed_data is None
        db.commit.assert_called_once()

    def test_validate_at_startup_logs_audit_on_tpm_unseal_failure(self):
        from app.services.license_crypto import validate_license_at_startup

        lic = _make_license(
            machine_fingerprint="stored-hash",
            hardware_id=base64.b64encode(b'{"mac":"00:11","cpu_serial":"cpu1","machine_id":"mid1","disk_serial":"ds1","hostname":"h1","os_version":"os1","dmi_uuid":"dmi1","boot_id":"boot1"}').decode(),
            tpm_sealed_data="tpm1:bad-sealed-data",
            status=LicenseStatus.ACTIVE,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = lic

        with patch("app.services.tpm_service.is_tpm_available", return_value=True):
            with patch("app.services.tpm_service.unseal_license_data", return_value=None):
                with patch("app.services.license_crypto.log_audit") as mock_audit:
                    validate_license_at_startup(db)
                    mock_audit.assert_called_once()
                    args, _ = mock_audit.call_args
                    assert args[4] == lic.id  # record_id


    def test_approve_device_change_reseals_tpm_data(self):
        from app.services.device_review_service import approve_device_change
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.id = "req-tpm-1"
        change_req.status = "pending"
        change_req.license_id = "lic-tpm-3"
        change_req.old_hardware_id = "old-b64"
        change_req.new_hardware_id = None
        change_req.match_count = 4
        change_req.total_components = 8
        change_req.expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        change_req.created_at = datetime.now(timezone.utc)
        change_req.deleted_at = None
        change_req.requested_by = None
        change_req.reviewed_by = None
        change_req.reviewed_at = None
        change_req.review_note = None

        lic = MagicMock(spec=License)
        lic.id = "lic-tpm-3"
        lic.machine_fingerprint = None
        lic.hardware_id = None
        lic.tpm_sealed_data = None
        lic.status = LicenseStatus.REVIEW_MODE
        lic.device_change_reason = None
        lic.device_change_requested_at = None

        db.query.return_value.filter.return_value.first.side_effect = [change_req, lic]

        with patch("app.services.tpm_service.seal_license_data", return_value="sw1:resealed"):
            result = approve_device_change(db, "req-tpm-1", "admin-1")

        assert result is not None
        assert lic.tpm_sealed_data == "sw1:resealed"


class TestDeviceHistory:
    """Tests for device change history endpoints."""

    def test_get_device_change_history_empty(self):
        from app.api.v1.endpoints.licenses import get_device_change_history

        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        user = MagicMock()
        user.school_id = "school-1"

        result = get_device_change_history(db=db, current_user=user)

        assert result.changes == []
        assert len(result.device) == 8  # short fingerprint

    def test_get_device_change_history_with_requests(self):
        from app.api.v1.endpoints.licenses import get_device_change_history

        db = MagicMock()
        db.query.return_value.filter.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [{"id": "req-1"}]

        user = MagicMock()
        user.school_id = "school-1"

        with patch("app.services.license_crypto.get_short_fingerprint", return_value="abc12345"):
            result = get_device_change_history(db=db, current_user=user)

        assert result.device == "abc12345"


class TestDeviceReview:
    """Tests for review mode workflow — device change requests, approve, reject."""

    def _make_license_record(self, **overrides):
        lic = MagicMock(spec=License)
        lic.id = "lic-review-1"
        lic.key = "ZNV-M-review-key-abc"
        lic.school_id = "school-review-1"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "stored-hardware-b64"
        lic.machine_fingerprint = "stored-hash"
        lic.device_change_reason = None
        lic.device_change_requested_at = None
        for k, v in overrides.items():
            setattr(lic, k, v)
        return lic

    def test_create_device_change_request_review_mode(self):
        from app.services.device_review_service import create_device_change_request

        lic = self._make_license_record()
        result = create_device_change_request(
            MagicMock(), lic,
            old_hardware_id="stored-hardware-b64",
            match_count=4, total_components=8,
        )

        assert result.status == "pending"
        assert result.match_count == 4
        assert result.total_components == 8
        assert result.old_hardware_id == "stored-hardware-b64"

    def test_create_device_change_request_device_locked(self):
        from app.services.device_review_service import create_device_change_request

        lic = self._make_license_record()
        result = create_device_change_request(
            MagicMock(), lic,
            old_hardware_id="stored-hardware-b64",
            match_count=1, total_components=8,
        )

        assert result.status == "pending"
        assert result.match_count == 1

    def test_create_device_change_request_auto_approved(self):
        from app.services.device_review_service import create_device_change_request

        lic = self._make_license_record()
        result = create_device_change_request(
            MagicMock(), lic,
            old_hardware_id="stored-hardware-b64",
            match_count=7, total_components=8,
        )

        assert result.status == "auto_approved"

    def test_approve_device_change(self):
        from app.services.device_review_service import approve_device_change
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.id = "req-1"
        change_req.license_id = "lic-review-1"
        change_req.status = "pending"

        lic = self._make_license_record()
        db.query.return_value.filter.return_value.first.side_effect = [change_req, lic]

        result = approve_device_change(db, "req-1", "admin-1", note="Approved")

        assert result is not None
        assert result.status == "approved"
        assert result.reviewed_by == "admin-1"

    def test_approve_device_change_not_found(self):
        from app.services.device_review_service import approve_device_change

        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = approve_device_change(db, "nonexistent", "admin-1")

        assert result is None

    def test_approve_device_change_already_processed(self):
        from app.services.device_review_service import approve_device_change
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.status = "approved"

        db.query.return_value.filter.return_value.first.return_value = change_req

        result = approve_device_change(db, "req-1", "admin-1")

        assert result is None

    def test_reject_device_change_suspends_license(self):
        from app.services.device_review_service import reject_device_change
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.id = "req-2"
        change_req.license_id = "lic-review-1"
        change_req.status = "pending"

        lic = self._make_license_record()
        db.query.return_value.filter.return_value.first.side_effect = [change_req, lic]

        result = reject_device_change(db, "req-2", "admin-1", note="Suspicious activity")

        assert result is not None
        assert result.status == "rejected"
        assert result.review_note == "Suspicious activity"
        assert lic.status == LicenseStatus.SUSPENDED

    def test_list_device_changes_filters_by_status(self):
        from app.api.v1.endpoints.licenses import list_device_changes

        db = MagicMock()
        query_mock = MagicMock()
        query_mock.filter.return_value.filter.return_value.order_by.return_value.all.return_value = []
        db.query.return_value = query_mock

        result = list_device_changes(status_filter="pending", db=db, current_user=MagicMock(is_superuser=True))

        assert result.total == 0
        assert result.requests == []

    def test_auto_approve_expired_requests(self):
        from app.services.device_review_service import auto_approve_expired_requests
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        expired_req = MagicMock(spec=DeviceChangeRequest)
        expired_req.id = "req-expired"
        expired_req.license_id = "lic-review-1"
        expired_req.status = "pending"
        expired_req.old_hardware_id = "old-b64"

        lic = self._make_license_record()
        db.query.return_value.filter.return_value.all.return_value = [expired_req]

        with patch("app.services.license_crypto.get_machine_fingerprint", return_value="new-hash"):
            with patch("app.services.license_crypto.encode_hardware_components", return_value="new-b64"):
                auto_approve_expired_requests(db)

        assert expired_req.status == "auto_approved"


class TestArchiveDeviceChanges:
    """Tests for archiving old device change requests."""

    def test_archive_old_device_changes_archives_old_resolved(self):
        from app.services.device_review_service import archive_old_device_changes
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        old_req = MagicMock(spec=DeviceChangeRequest)
        old_req.id = "req-old-1"
        old_req.status = "approved"
        old_req.old_hardware_id = "old-b64"
        old_req.license_id = "lic-1"

        # Second query (archive) returns old_req; auto_approve gets empty
        def query_side_effect(model):
            if model == DeviceChangeRequest:
                q = MagicMock()
                q.filter.return_value.all.return_value = [old_req]
                return q
            return MagicMock()

        db.query.side_effect = query_side_effect

        with patch("app.services.device_review_service.auto_approve_expired_requests"):
            count = archive_old_device_changes(db)

        assert count == 1
        assert old_req.status == "archived"
        assert old_req.deleted_at is not None

    def test_archive_old_device_changes_skips_recent(self):
        from app.services.device_review_service import archive_old_device_changes

        db = MagicMock()
        q = MagicMock()
        q.filter.return_value.filter.return_value.filter.return_value.all.return_value = []
        db.query.return_value = q

        with patch("app.services.device_review_service.auto_approve_expired_requests"):
            count = archive_old_device_changes(db)

        assert count == 0


class TestGracePeriodEnforcer:
    """Tests for offline grace period enforcement background job."""

    def test_enforcer_expires_license_past_grace(self):
        from app.services.grace_period_enforcer import enforce_offline_grace_periods

        lic = _make_license(
            status=LicenseStatus.ACTIVE,
            machine_fingerprint="hash",
            hardware_id="b64",
            runtime_environment="bare_metal",
            offline_grace_start=datetime.now(timezone.utc) - timedelta(days=60),
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [lic]

        count = enforce_offline_grace_periods(db)

        assert count == 1
        assert lic.status == LicenseStatus.EXPIRED

    def test_enforcer_skips_license_within_grace(self):
        from app.services.grace_period_enforcer import enforce_offline_grace_periods

        lic = _make_license(
            status=LicenseStatus.ACTIVE,
            machine_fingerprint="hash",
            hardware_id="b64",
            runtime_environment="bare_metal",
            offline_grace_start=datetime.now(timezone.utc) - timedelta(days=10),
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [lic]

        count = enforce_offline_grace_periods(db)

        assert count == 0
        assert lic.status == LicenseStatus.ACTIVE

    def test_enforcer_skips_licenses_without_offline_start(self):
        from app.services.grace_period_enforcer import enforce_offline_grace_periods

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        count = enforce_offline_grace_periods(db)

        assert count == 0
        db.commit.assert_not_called()


class TestBackfillTpm:
    """Tests for backfilling TPM sealed data for existing licenses."""

    def test_backfill_skips_licenses_with_tpm_data(self):
        from app.services.backfill_tpm import backfill_tpm_sealed_data

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        count = backfill_tpm_sealed_data(db)

        assert count == 0

    def test_backfill_updates_licenses_missing_tpm_data(self):
        from app.services.backfill_tpm import backfill_tpm_sealed_data

        lic = _make_license(
            machine_fingerprint="existing-hash",
            hardware_id="b64",
            tpm_sealed_data=None,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [lic]

        with patch("app.services.tpm_service.seal_license_data", return_value="sw1:backfilled"):
            count = backfill_tpm_sealed_data(db)

        assert count == 1
        assert lic.tpm_sealed_data == "sw1:backfilled"


class TestFullDeviceChangeFlow:
    """Integration tests for complete device change lifecycle."""

    def test_flow_approve_device_change_full_lifecycle(self):
        """device change request → admin approve → TPM reseal → archive"""
        from app.services.device_review_service import (
            create_device_change_request, approve_device_change,
            archive_old_device_changes,
        )
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        lic = MagicMock(spec=License)
        lic.id = "lic-flow-1"
        lic.key = "ZNV-flow-key"
        lic.school_id = "school-1"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "old-b64"
        lic.machine_fingerprint = "old-hash"
        lic.tpm_sealed_data = "sw1:old-sealed"

        req = create_device_change_request(
            db, lic,
            old_hardware_id="old-b64",
            match_count=4, total_components=8,
        )
        assert req.status == "pending"
        assert req.license_id == "lic-flow-1"

        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.id = "req-flow-1"
        change_req.license_id = "lic-flow-1"
        change_req.status = "pending"
        change_req.old_hardware_id = "old-b64"

        db.query.return_value.filter.return_value.first.side_effect = [change_req, lic]

        with patch("app.services.tpm_service.seal_license_data", return_value="sw1:resealed"):
            result = approve_device_change(db, "req-flow-1", "admin-1", note="Looks good")

        assert result is not None
        assert result.status == "approved"
        assert result.reviewed_by == "admin-1"
        assert result.review_note == "Looks good"
        assert lic.tpm_sealed_data == "sw1:resealed"
        assert lic.hardware_id is not None

        old_resolved = MagicMock(spec=DeviceChangeRequest)
        old_resolved.id = "req-flow-1"
        old_resolved.status = "approved"
        old_resolved.updated_at = datetime.now(timezone.utc) - timedelta(days=31)

        def query_side_effect(model):
            q = MagicMock()
            if model == DeviceChangeRequest:
                q.filter.return_value.all.return_value = [old_resolved]
                q.filter.return_value.filter.return_value.all.return_value = []
            return q
        db.query.side_effect = query_side_effect

        archived = archive_old_device_changes(db)
        assert archived == 1
        assert old_resolved.status == "archived"

    def test_flow_reject_device_change_suspends_license_then_new_license(self):
        """device change request → reject → license suspended"""
        from app.services.device_review_service import (
            create_device_change_request, reject_device_change,
        )
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        lic = MagicMock(spec=License)
        lic.id = "lic-flow-2"
        lic.key = "ZNV-flow-key-2"
        lic.school_id = "school-1"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "old-b64"
        lic.machine_fingerprint = "old-hash"

        req = create_device_change_request(
            db, lic, old_hardware_id="old-b64",
            match_count=2, total_components=8,
        )
        assert req.status == "pending"

        change_req = MagicMock(spec=DeviceChangeRequest)
        change_req.id = "req-flow-2"
        change_req.license_id = "lic-flow-2"
        change_req.status = "pending"

        db.query.return_value.filter.return_value.first.side_effect = [change_req, lic]

        result = reject_device_change(db, "req-flow-2", "admin-1", note="Unauthorized device")
        assert result is not None
        assert result.status == "rejected"
        assert lic.status == LicenseStatus.SUSPENDED

    def test_flow_auto_approve_threshold_met(self):
        """device change at 7/8 match → auto_approved on request (bind happens during processing)"""
        from app.services.device_review_service import create_device_change_request

        lic = MagicMock(spec=License)
        lic.id = "lic-flow-3"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "old-b64"
        lic.machine_fingerprint = "old-hash"

        req = create_device_change_request(
            MagicMock(), lic,
            old_hardware_id="old-b64",
            match_count=7, total_components=8,
        )

        assert req.status == "auto_approved"
        assert lic.status == LicenseStatus.ACTIVE  # status unchanged for auto_approved

    def test_flow_grace_period_then_enforcer(self):
        """license goes offline → grace start set → enforcer expires after grace"""
        from app.services.grace_period_enforcer import enforce_offline_grace_periods

        offline_lic = _make_license(
            id="lic-grace-1",
            runtime_environment="bare_metal",
            offline_grace_start=datetime.now(timezone.utc) - timedelta(days=60),
            status=LicenseStatus.ACTIVE,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [offline_lic]

        expired = enforce_offline_grace_periods(db)

        assert expired == 1
        assert offline_lic.status == LicenseStatus.EXPIRED

    def test_flow_grace_period_within_grace_skipped(self):
        """license offline but within grace → NOT expired"""
        from app.services.grace_period_enforcer import enforce_offline_grace_periods

        now = datetime.now(timezone.utc)
        within_grace = now - timedelta(hours=12)

        lic = _make_license(
            id="lic-grace-2",
            runtime_environment="bare_metal",
            offline_grace_start=within_grace,
            status=LicenseStatus.ACTIVE,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [lic]

        expired = enforce_offline_grace_periods(db)

        assert expired == 0
        assert lic.status == LicenseStatus.ACTIVE

    def test_flow_backfill_tpm_then_validation(self):
        """old license without TPM → backfill → validation uses TPM"""
        from app.services.backfill_tpm import backfill_tpm_sealed_data

        lic = _make_license(
            machine_fingerprint="hash",
            hardware_id="b64",
            tpm_sealed_data=None,
        )
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [lic]

        with patch("app.services.tpm_service.seal_license_data", return_value="sw1:backfilled-hash"):
            count = backfill_tpm_sealed_data(db)

        assert count == 1
        assert lic.tpm_sealed_data == "sw1:backfilled-hash"

        from app.services.license_crypto import validate_license_at_startup
        db2 = MagicMock()
        db2.query.return_value.filter.return_value.first.return_value = lic
        lic.valid_until = datetime.now(timezone.utc) + timedelta(days=30)
        lic.machine_fingerprint = None  # clear fingerprint to skip matching

        with patch("app.services.license_crypto._can_reach_license_server", return_value=True):
            with patch("app.services.license_crypto._verify_cloud_license") as mock_verify:
                mock_verify.return_value = {"valid": True}
                result = validate_license_at_startup(db2)

        assert result["valid"] is True

    def test_flow_email_notification_sent_on_device_change_request(self):
        """device change request triggers email to super admins with email"""
        from app.services.device_review_service import create_device_change_request
        from app.services.email_service import send_email

        lic = MagicMock(spec=License)
        lic.id = "lic-email-1"
        lic.key = "ZNV-email-test"
        lic.school_id = "school-1"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "old-b64"
        lic.machine_fingerprint = "old-hash"

        from app.models.user import User
        admin = MagicMock(spec=User)
        admin.id = "admin-1"
        admin.email = "admin@school.com"
        admin.full_name = "Super Admin"
        admin.is_superuser = True
        admin.is_active = True
        admin.school_id = None

        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = [admin]

        with patch("app.services.email_service.send_email") as mock_email:
            req = create_device_change_request(
                db, lic,
                old_hardware_id="old-b64",
                match_count=4, total_components=8,
            )

        assert req.status == "pending"
        mock_email.assert_called_once()
        call_args = mock_email.call_args[1]
        assert call_args["to_email"] == "admin@school.com"
        assert "Device Change Requires Review" in call_args["subject"]
        assert lic.key in call_args["body_text"]

    def test_flow_cloud_verify_receives_tpm_data(self):
        """_verify_cloud_license passes tpm_sealed and environment in payload"""
        import httpx

        from app.services.license_crypto import _verify_cloud_license

        with patch.object(httpx, "post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"valid": True}
            mock_post.return_value = mock_response

            result = _verify_cloud_license(
                key="ZNV-test",
                fingerprint="fp123",
                tpm_sealed="sw1:sealed-data",
                environment="bare_metal",
            )

        assert result["valid"] is True
        mock_post.assert_called_once()
        call_payload = mock_post.call_args[1]["json"]
        assert call_payload["key"] == "ZNV-test"
        assert call_payload["tpm_sealed"] == "sw1:sealed-data"
        assert call_payload["environment"] == "bare_metal"

    def test_flow_request_archive_full_cycle(self):
        """pending request → expires after 48h → auto_approved → eventually archived"""
        from app.services.device_review_service import (
            create_device_change_request, auto_approve_expired_requests,
            archive_old_device_changes,
        )
        from app.models.device_change_request import DeviceChangeRequest

        db = MagicMock()
        lic = MagicMock(spec=License)
        lic.id = "lic-arch-flow"
        lic.key = "ZNV-arch-flow"
        lic.school_id = "school-1"
        lic.status = LicenseStatus.ACTIVE
        lic.hardware_id = "old-b64"
        lic.machine_fingerprint = "old-hash"

        req = create_device_change_request(
            db, lic, old_hardware_id="old-b64",
            match_count=4, total_components=8,
        )
        assert req.status == "pending"

        expired_req = MagicMock(spec=DeviceChangeRequest)
        expired_req.id = "req-arch-1"
        expired_req.license_id = "lic-arch-flow"
        expired_req.status = "pending"
        expired_req.old_hardware_id = "old-b64"

        db.query.return_value.filter.return_value.all.return_value = [expired_req]

        with patch("app.services.license_crypto.get_machine_fingerprint", return_value="new-hash"):
            with patch("app.services.license_crypto.encode_hardware_components", return_value="new-b64"):
                auto_approve_expired_requests(db)

        assert expired_req.status == "auto_approved"

        expired_req.status = "auto_approved"
        expired_req.updated_at = (datetime.now(timezone.utc) - timedelta(days=31))

        def query_side_effect(model):
            q = MagicMock()
            if model == DeviceChangeRequest:
                q.filter.return_value.all.return_value = [expired_req]
                q.filter.return_value.filter.return_value.all.return_value = []
            return q
        db.query.side_effect = query_side_effect

        archived = archive_old_device_changes(db)
        assert archived == 1
        assert expired_req.status == "archived"
