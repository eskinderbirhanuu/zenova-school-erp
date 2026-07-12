"""API integration tests — auth flows, pagination contract, finance, NFC.

Uses TestClient with dependency overrides (no real DB).
"""
from unittest.mock import MagicMock, PropertyMock, patch
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest

from app.database import get_db
from app.core.auth_deps import get_current_user, require_licensed_feature
from app.core.pagination import paginate, build_paginated_response


PASS = "strongpass123"


def make_mock_user(**kwargs):
    user = MagicMock()
    user.id = kwargs.get("id", "user-int-1")
    user.email = kwargs.get("email", "admin@zenova.app")
    user.school_id = kwargs.get("school_id", "school-1")
    user.is_active = kwargs.get("is_active", True)
    user.is_superuser = kwargs.get("is_superuser", True)
    user.is_view_only = kwargs.get("is_view_only", False)
    user.employee_id = kwargs.get("employee_id", "ZNV-001")
    user.mfa_enabled = kwargs.get("mfa_enabled", False)
    user.hashed_password = "$2b$12$" + "x" * 53
    role = MagicMock()
    role.name = kwargs.get("role", "SUPER_ADMIN")
    user.role = role
    return user


def make_mock_db(**kwargs):
    db = MagicMock()
    q = MagicMock()
    q.count.return_value = kwargs.get("count", 3)
    q.offset.return_value.limit.return_value.all.return_value = kwargs.get("items", [])
    q.order_by.return_value = q
    q.filter.return_value = q
    q.execution_options.return_value = q
    db.query.return_value = q
    return db


@pytest.fixture(autouse=True)
def license_patch():
    with patch("app.services.license_crypto.get_cached_license_status") as m:
        m.return_value = {"valid": True}
        yield m


# ---------------------------------------------------------------------------
# 1. Auth Integration Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_client():
    from app.api.v1.endpoints.auth import router, LOGIN_RATE_LIMIT
    app = FastAPI()
    app.include_router(router, prefix="/api/v1/auth", tags=["auth"])
    app.dependency_overrides[get_db] = lambda: make_mock_db()
    app.dependency_overrides[LOGIN_RATE_LIMIT] = lambda: "127.0.0.1"
    return TestClient(app)


class TestAuthLogin:
    def test_login_mfa_enforced_for_finance(self, auth_client):
        with patch("app.api.v1.endpoints.auth.auth_service.authenticate_user") as mock_auth:
            mock_auth.return_value = make_mock_user(role="FINANCE", mfa_enabled=False)
            with patch("app.api.v1.endpoints.auth._check_brute_force"):
                resp = auth_client.post("/api/v1/auth/login",
                    json={"email": "finance@zenova.app", "password": PASS})
                assert resp.status_code == 403
                assert "MFA" in resp.json()["detail"]

    def test_login_invalid_credentials_returns_401(self, auth_client):
        with patch("app.api.v1.endpoints.auth.auth_service.authenticate_user") as mock_auth:
            mock_auth.return_value = None
            with patch("app.api.v1.endpoints.auth._check_brute_force"):
                with patch("app.api.v1.endpoints.auth._record_failed_login"):
                    resp = auth_client.post("/api/v1/auth/login",
                        json={"email": "nobody@zenova.app", "password": PASS})
                    assert resp.status_code == 401
                    assert "Invalid" in resp.json()["detail"]

    def test_login_success_sets_cookies(self, auth_client):
        user = make_mock_user(role="ADMIN")
        with patch("app.api.v1.endpoints.auth.auth_service.authenticate_user") as mock_auth:
            mock_auth.return_value = user
            with patch("app.api.v1.endpoints.auth.auth_service.create_access_token") as mock_at:
                mock_at.return_value = "access-token-123"
                with patch("app.api.v1.endpoints.auth.auth_service.create_refresh_token") as mock_rt:
                    mock_rt.return_value = "refresh-token-456"
                    with patch("app.api.v1.endpoints.auth.auth_service.get_user_role_name") as mock_role:
                        mock_role.return_value = "ADMIN"
                        with patch("app.api.v1.endpoints.auth.mfa_service.mfa_required_for_role") as mock_mfa:
                            mock_mfa.return_value = False
                            with patch("app.api.v1.endpoints.auth._check_brute_force"):
                                resp = auth_client.post("/api/v1/auth/login",
                                    json={"email": "admin@zenova.app", "password": PASS})
                                assert resp.status_code == 200
                                data = resp.json()
                                assert data["role_name"] == "ADMIN"
                                assert data["mfa_required"] is False
                                set_cookie = resp.headers.get("set-cookie", "")
                                assert "access_token=access-token-123" in set_cookie
                                assert "refresh_token=refresh-token-456" in set_cookie
                                assert "user_role=ADMIN" in set_cookie
                                assert "HttpOnly" in set_cookie

    def test_login_response_structure(self, auth_client):
        with patch("app.api.v1.endpoints.auth.auth_service.authenticate_user") as mock_auth:
            mock_auth.return_value = make_mock_user()
            with patch("app.api.v1.endpoints.auth.auth_service.create_access_token") as mock_at:
                mock_at.return_value = "tok"
                with patch("app.api.v1.endpoints.auth.auth_service.create_refresh_token") as mock_rt:
                    mock_rt.return_value = "rtok"
                    with patch("app.api.v1.endpoints.auth.auth_service.get_user_role_name") as mock_role:
                        mock_role.return_value = "ADMIN"
                        with patch("app.api.v1.endpoints.auth.mfa_service.mfa_required_for_role") as mock_mfa:
                            mock_mfa.return_value = False
                            with patch("app.api.v1.endpoints.auth._check_brute_force"):
                                resp = auth_client.post("/api/v1/auth/login",
                                    json={"email": "admin@zenova.app", "password": PASS})
                                assert resp.status_code == 200
                                keys = set(resp.json().keys())
                                for k in ("access_token", "refresh_token", "employee_id", "role_name", "mfa_required"):
                                    assert k in keys

    def test_mfa_token_returned_when_user_has_mfa_enabled(self, auth_client):
        user = make_mock_user(role="SUPER_ADMIN", mfa_enabled=True)
        with patch("app.api.v1.endpoints.auth.auth_service.authenticate_user") as mock_auth:
            mock_auth.return_value = user
            with patch("app.api.v1.endpoints.auth.mfa_service.mfa_required_for_role") as mock_req:
                mock_req.return_value = True
                with patch("app.api.v1.endpoints.auth.auth_service.create_mfa_token") as mock_mfa_tok:
                    mock_mfa_tok.return_value = "mfa-token-abc"
                    with patch("app.api.v1.endpoints.auth.auth_service.get_user_role_name") as mock_role:
                        mock_role.return_value = "SUPER_ADMIN"
                        with patch("app.api.v1.endpoints.auth._check_brute_force"):
                            resp = auth_client.post("/api/v1/auth/login",
                                json={"email": "admin@zenova.app", "password": PASS})
                            assert resp.status_code == 200
                            data = resp.json()
                            assert data["mfa_required"] is True
                            assert data["mfa_token"] == "mfa-token-abc"


# ---------------------------------------------------------------------------
# 2. Pagination Contract Tests
# ---------------------------------------------------------------------------

class TestPaginationContract:
    def test_build_paginated_response(self):
        resp = build_paginated_response(
            items=[{"id": "1"}], total=100, page=2, page_size=25, total_pages=4
        )
        assert resp.items == [{"id": "1"}]
        assert resp.total == 100
        assert resp.page == 2
        assert resp.page_size == 25
        assert resp.total_pages == 4


# ---------------------------------------------------------------------------
# 3. NFC Endpoint Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def nfc_client():
    from app.api.v1.endpoints.nfc_v2 import router
    app = FastAPI()
    app.include_router(router, prefix="/api/v1", tags=["nfc"])
    app.dependency_overrides[get_db] = lambda: make_mock_db()
    return TestClient(app)


class TestNfcEndpoints:
    def test_assign_student_card_requires_student_create_permission(self, nfc_client):
        """Teacher role (no STUDENT_CREATE) gets 403 on student card assign."""
        teacher = make_mock_user(role="TEACHER", is_superuser=False)
        nfc_client.app.dependency_overrides[get_current_user] = lambda: teacher
        resp = nfc_client.post("/api/v1/nfc/student/assign",
            json={"reference_id": "stud-1", "card_uid": "uid-001", "card_tier": "standard"})
        assert resp.status_code == 403

    def test_bulk_assign_requires_card_print_assign_permission(self, nfc_client):
        teacher = make_mock_user(role="TEACHER", is_superuser=False)
        nfc_client.app.dependency_overrides[get_current_user] = lambda: teacher
        resp = nfc_client.post("/api/v1/nfc/bulk-assign",
            json=[{"reference_id": "s1", "card_type": "student", "card_uid": "uid-001"}])
        assert resp.status_code == 403

    def test_nfc_by_card_missing_returns_404(self, nfc_client):
        nfc_client.app.dependency_overrides[get_current_user] = lambda: make_mock_user()
        with patch("app.api.v1.endpoints.nfc_v2.nfc_v2_service.get_student_by_card",
                   return_value=None):
            resp = nfc_client.get("/api/v1/nfc/student/by-card/missing-uid")
            assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 4. Pagination Utility Unit Tests
# ---------------------------------------------------------------------------

class TestPaginationUtility:
    def test_paginate_page1(self):
        q = MagicMock(); q.count.return_value = 100
        _, total, page, page_size, total_pages = paginate(q, 1, 20)
        assert total == 100 and page == 1 and page_size == 20 and total_pages == 5
        q.offset.assert_called_once_with(0)

    def test_paginate_mid_page(self):
        q = MagicMock(); q.count.return_value = 100
        _, total, page, page_size, total_pages = paginate(q, 3, 20)
        assert page == 3 and total_pages == 5
        q.offset.assert_called_once_with(40)

    def test_paginate_empty(self):
        q = MagicMock(); q.count.return_value = 0
        _, total, page, page_size, total_pages = paginate(q, 1, 20)
        assert total == 0 and page == 1 and page_size == 20 and total_pages == 1
