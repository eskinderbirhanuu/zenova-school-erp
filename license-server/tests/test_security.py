"""Security regression tests for the ZENOVA license server.

Covers:
- School login MUST NOT produce a super-admin token (privilege escalation fix).
- Heartbeat endpoint must verify the HMAC signature.
"""
import os
import tempfile

os.environ["SECRET_KEY"] = "test-secret-key-not-for-prod"
os.environ["SUPER_ADMIN_PASSWORD"] = "test-admin-pass"
os.environ["SUPER_ADMIN_EMAIL"] = "super@zenova.app"
os.environ["HEARTBEAT_SECRET"] = "test-heartbeat-secret"
_db_fd, _db_path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_path}"

import hmac
import hashlib

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


def _register_school(email="school@test.et", password="schoolpass123"):
    r = client.post(
        "/api/v1/schools/register",
        json={"name": "Test School", "email": email, "password": password},
    )
    return r


def _admin_login():
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "super@zenova.app", "password": "test-admin-pass"},
    )
    return r.json()["access_token"]


def _school_login(email="school@test.et", password="schoolpass123"):
    r = client.post(
        "/api/v1/auth/school/login",
        json={"email": email, "password": password},
    )
    return r.json()["access_token"]


def test_school_login_does_not_grant_admin():
    _register_school()
    token = _school_login()
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/v1/license/generate",
            headers=headers,
            json={"school_id": "x", "license_type": "yearly"},
        ).status_code
        == 401
    )


def test_admin_login_still_works():
    _register_school(email="school2@test.et")
    token = _admin_login()
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/v1/admin/dashboard", headers=headers).status_code == 200


def test_heartbeat_requires_valid_hmac():
    _register_school(email="school3@test.et")
    payload = {
        "school_code": "TEST001",
        "server_id": "srv-1",
        "version": "0",
        "license_key": "",
    }
    assert client.post("/api/v1/heartbeat", json=payload).status_code == 401

    bad = hmac.new(b"wrong-secret", b"TEST001", hashlib.sha256).hexdigest()
    assert (
        client.post("/api/v1/heartbeat", json=payload, headers={"X-HMAC-Signature": bad}).status_code
        == 401
    )

    good = hmac.new(b"test-heartbeat-secret", b"TEST001", hashlib.sha256).hexdigest()
    r = client.post("/api/v1/heartbeat", json=payload, headers={"X-HMAC-Signature": good})
    assert r.status_code == 200
    assert r.json()["status"] == "received"
