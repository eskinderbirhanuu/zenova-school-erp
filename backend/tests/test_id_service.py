"""Tests for id_service — retry logic on first-insert race conditions."""
from unittest.mock import MagicMock
import pytest
from sqlalchemy.exc import IntegrityError
from app.services.id_service import generate_id


class TestGenerateId:
    def test_generate_normal(self):
        db = MagicMock()
        seq = MagicMock()
        seq.last_number = 5
        seq.prefix = "STU"
        db.query.return_value.filter.return_value.with_for_update.return_value.first.return_value = seq
        result = generate_id(db, "student", "school-1")
        assert result == "STU-2026-00006"

    def test_first_insert_then_succeed(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            None,
            None,
        ]
        db.flush.side_effect = [IntegrityError("stmt", "params", "orig"), None]
        seq = MagicMock()
        seq.last_number = 0
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            None,
            seq,
        ]

        result = generate_id(db, "student", "school-1")
        assert result.startswith("STU-2026-")
        assert db.rollback.called

    def test_all_attempts_exhausted_raises(self):
        db = MagicMock()
        seq = MagicMock()
        seq.last_number = 0
        db.query.return_value.filter.return_value.with_for_update.return_value.first.side_effect = [
            None, seq, None, seq, None, seq,
        ]
        db.flush.side_effect = IntegrityError("stmt", "params", "orig")
        with pytest.raises(RuntimeError, match="Could not generate sequence number"):
            generate_id(db, "student", "school-1")

    def test_unknown_entity_type_raises(self):
        db = MagicMock()
        with pytest.raises(ValueError, match="Unknown entity type"):
            generate_id(db, "unknown_type", "school-1")
