"""Security + APU public-endpoint tests for the ZENOVA Control Center.

Covers:
- Admin CRUD endpoints now require an admin bearer token (authz enforcement).
- Public APU endpoints (/public/*) remain open and return school branding + config.
"""
import os
import tempfile

_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"
os.environ["SECRET_KEY"] = "test-cc-secret-key"
os.environ["SUPER_ADMIN_EMAIL"] = "admin@zenova.app"
os.environ["SUPER_ADMIN_PASSWORD"] = "admin-pass"

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def _db():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    os.close(_db_fd)
    try:
        os.unlink(_db_path)
    except OSError:
        pass


def _admin_headers():
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@zenova.app", "password": "admin-pass"},
    )
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_admin_endpoints_require_auth():
    assert client.get("/api/v1/customers").status_code == 401
    assert (
        client.post(
            "/api/v1/customers",
            json={"name": "X", "domain": "x.zenova.et", "email": "x@x.et"},
        ).status_code
        == 401
    )
    assert client.get("/api/v1/licenses").status_code == 401
    assert client.get("/api/v1/updates").status_code == 401
    assert client.get("/api/v1/monitoring/dashboard").status_code == 401


def test_admin_endpoints_work_with_token():
    headers = _admin_headers()
    r = client.post(
        "/api/v1/customers",
        headers=headers,
        json={
            "name": "Omega School",
            "domain": "omega.zenova.et",
            "email": "omega@zenova.et",
            "primary_color": "#0EA5E9",
            "tagline": "Excellence first",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["primary_color"] == "#0EA5E9"
    assert body["tagline"] == "Excellence first"
    assert client.get("/api/v1/customers", headers=headers).status_code == 200
    assert client.get("/api/v1/licenses", headers=headers).status_code == 200


def test_public_endpoints_remain_open():
    assert client.get("/api/v1/public/partners").status_code == 200
    assert client.get("/api/v1/public/schools").status_code == 200
    assert client.get("/api/v1/public/config").status_code == 200


def test_public_resolve_returns_branding():
    headers = _admin_headers()
    client.post(
        "/api/v1/customers",
        headers=headers,
        json={
            "name": "Beta School",
            "domain": "beta.zenova.et",
            "email": "beta@zenova.et",
            "primary_color": "#16A34A",
            "logo_url": "https://beta.zenova.et/logo.png",
            "features": '{"attendance": true, "finance": false}',
            "local_url": "https://192.168.1.8:8443",
            "local_url_label": "School LAN server",
        },
    )
    ok = client.post("/api/v1/public/schools/resolve", json={"code": "BETA"})
    assert ok.status_code == 200
    body = ok.json()
    assert body["found"] is True
    school = body["school"]
    assert school["name"] == "Beta School"
    assert school["api_url"] == "https://beta.zenova.et"
    assert school["branding"]["primary_color"] == "#16A34A"
    assert school["features"] == {"attendance": True, "finance": False}
    assert school["local_url"] == "https://192.168.1.8:8443"
    assert school["local_url_label"] == "School LAN server"

    missing = client.post("/api/v1/public/schools/resolve", json={"code": "NOPE123"})
    assert missing.status_code == 200
    assert missing.json()["found"] is False


def test_public_config_shape():
    cfg = client.get("/api/v1/public/config").json()
    assert "minimum_version" in cfg
    assert "recommended_version" in cfg
    assert "maintenance_mode" in cfg
    assert isinstance(cfg["features"], dict)
