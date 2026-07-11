"""Tests for settings endpoint — schema validation, unknown keys rejection."""
from unittest.mock import MagicMock, patch
import pytest
from app.schemas.settings import SchoolSettingsPayload, SchoolSettingsUpdate
from pydantic import ValidationError


class TestSchoolSettingsSchema:
    def test_accepts_known_keys(self):
        payload = SchoolSettingsPayload(
            current_academic_year="2025/26",
            timezone="Africa/Addis_Ababa",
            currency="ETB",
        )
        data = payload.model_dump(exclude_none=True)
        assert data["current_academic_year"] == "2025/26"
        assert data["timezone"] == "Africa/Addis_Ababa"
        assert data["currency"] == "ETB"

    def test_accepts_partial_update(self):
        payload = SchoolSettingsPayload(session_timeout="60")
        data = payload.model_dump(exclude_none=True)
        assert data == {"session_timeout": "60"}

    def test_rejects_unknown_keys(self):
        with pytest.raises(ValidationError):
            SchoolSettingsPayload(**{"unknown_field": "value"})

    def test_rejects_unknown_keys_inside_wrapper(self):
        with pytest.raises(ValidationError):
            SchoolSettingsUpdate(settings={"unknown_field": "value"})

    def test_accepts_empty_payload(self):
        payload = SchoolSettingsPayload()
        data = payload.model_dump(exclude_none=True)
        assert data == {}
