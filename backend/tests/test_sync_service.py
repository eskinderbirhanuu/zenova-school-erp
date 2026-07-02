"""Tests for sync service — enqueue, dedup, conflict detection."""
from unittest.mock import MagicMock, patch
from datetime import datetime
import pytest

from app.services import sync_service


class TestEnqueue:
    def test_enqueue_creates_entry(self):
        db = MagicMock()
        entry = sync_service.enqueue_sync(
            db, table_name="students", record_id="stu-1",
            operation="create", payload={"name": "test"},
        )
        assert entry is not None
        assert entry.table_name == "students"
        assert entry.record_id == "stu-1"
        db.add.assert_called_once()
        db.commit.assert_called_once()

    def test_enqueue_sets_priority(self):
        db = MagicMock()
        entry = sync_service.enqueue_sync(db, table_name="attendance", record_id="a-1", operation="create")
        assert entry.priority == "1"
        entry2 = sync_service.enqueue_sync(db, table_name="notifications", record_id="n-1", operation="create")
        assert entry2.priority == "5"


class TestDedup:
    def test_inbound_dedup_same_payload_hash(self):
        db = MagicMock()
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing

        count = sync_service.apply_sync_payload(
            db, table="students", record_id="stu-1",
            operation="create", payload={"name": "test"},
            payload_hash="abc123", school_id="s-1",
        )
        assert count == 0
        db.add.assert_not_called()

    def test_inbound_accepted_new_payload(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None

        count = sync_service.apply_sync_payload(
            db, table="students", record_id="stu-2",
            operation="create", payload={"name": "new"},
            payload_hash="xyz789", school_id="s-1",
        )
        assert count == 1
        db.add.assert_called_once()
        db.commit.assert_called_once()


class TestConflictDetection:
    def test_conflict_logged_when_local_newer(self):
        db = MagicMock()

        local = MagicMock()
        local.updated_at = None
        local.created_at = datetime(2025, 6, 1, 0, 0, 0)

        def query_side_effect(model):
            mock = MagicMock()
            if model.__name__ == "SyncInbound":
                mock.filter.return_value.first.return_value = None
            elif model.__name__ == "Student":
                mock.filter.return_value.first.return_value = local
            elif model.__name__ == "ConflictLog":
                mock.filter.return_value.first.return_value = None
            return mock

        db.query.side_effect = query_side_effect

        payload = {
            "name": "conflict",
            "server_id": "server-remote",
            "version": str(datetime(2024, 1, 1, 0, 0, 0).timestamp()),
        }
        with patch.object(sync_service, "_log_conflict") as mock_log:
            count = sync_service.apply_sync_payload(
                db, table="students", record_id="stu-conflict",
                operation="update", payload=payload,
                payload_hash="conflict-hash", school_id="s-1",
            )
        assert count == 0
        mock_log.assert_called_once()

    def test_no_conflict_when_incoming_newer(self):
        db = MagicMock()

        inbound_mock = MagicMock()
        inbound_mock.filter.return_value.first.return_value = None

        student_mock = MagicMock()
        local = MagicMock()
        local.updated_at = None
        local.created_at = datetime(2024, 6, 1, 0, 0, 0)
        student_mock.filter.return_value.first.return_value = local

        def query_side_effect(model):
            if model.__name__ == "SyncInbound":
                return inbound_mock
            if model.__name__ == "Student":
                return student_mock
            return MagicMock()

        db.query.side_effect = query_side_effect

        payload = {
            "name": "newer",
            "server_id": "server-remote",
            "version": str(datetime(2025, 1, 1, 0, 0, 0).timestamp()),
        }
        with patch.object(sync_service, "_log_conflict") as mock_log:
            count = sync_service.apply_sync_payload(
                db, table="students", record_id="stu-newer",
                operation="update", payload=payload,
                payload_hash="newer-hash", school_id="s-1",
            )
        assert count == 1
        mock_log.assert_not_called()
