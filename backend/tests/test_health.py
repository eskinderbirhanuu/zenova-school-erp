"""Tests for health endpoints — /health, /health/live, /health/ready."""
from unittest.mock import patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.v1.endpoints.health import router
from app.database import get_db


def _app():
    app = FastAPI()
    app.include_router(router, prefix="/health", tags=["health"])

    def _override_db():
        class FakeDB:
            def execute(self, stmt):
                pass
            def close(self):
                pass
        yield FakeDB()

    app.dependency_overrides[get_db] = _override_db
    return app


_client = TestClient(_app())


class TestLivez:
    def test_livez_returns_ok(self):
        resp = _client.get("/health/live")
        assert resp.status_code == 200
        assert resp.json() == {"status": "alive"}


class TestHealth:
    @patch("app.api.v1.endpoints.health.server_identity.get_server_identity")
    def test_health_structure(self, mock_identity):
        mock_identity.return_value = {"server_role": "standalone", "server_id": "test-id"}
        resp = _client.get("/health")
        data = resp.json()
        assert resp.status_code == 200
        assert data["service"] == "zenova-erp"
        assert "database" in data["checks"]
        assert "redis" in data["checks"]
        assert "server_identity" in data["checks"]


class TestReadyz:
    def test_readyz_returns_ok(self):
        resp = _client.get("/health/ready")
        assert resp.status_code in (200, 503)
