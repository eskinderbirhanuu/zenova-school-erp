"""Tests for archive/restore service."""
from unittest.mock import MagicMock, PropertyMock, patch
from datetime import datetime, timezone, timedelta
import pytest

from app.services import archive_service


def _make_column(name):
    col = MagicMock()
    col.name = name
    return col


def _make_mock_row(id="row-1", school_id="school-1", created_at=None):
    row = MagicMock(spec=object)
    row.id = id
    row.school_id = school_id
    if created_at is None:
        created_at = datetime.now(timezone.utc) - timedelta(days=1000)
    row.created_at = created_at

    cols = [_make_column("id"), _make_column("school_id"), _make_column("created_at")]
    tbl = MagicMock()
    tbl.columns = cols
    type(row).__table__ = PropertyMock(return_value=tbl)
    return row


class TestTableSizes:
    def test_get_table_sizes_returns_list(self):
        db = MagicMock()
        db.query.return_value.scalar.return_value = 0
        sizes = archive_service.get_table_sizes(db)
        assert isinstance(sizes, list)
        assert len(sizes) > 0


class TestArchiveRun:
    def test_archive_moves_old_records(self):
        db = MagicMock()
        row = _make_mock_row()
        db.query.return_value.filter.return_value.all.return_value = [row]

        with patch.object(archive_service, "ARCHIVABLE_TABLES", {
            "attendance": {"retention_days": 30},
        }):
            result = archive_service.run_archive(db, table_name="attendance")
        assert result["results"][0]["archived"] == 1


class TestRestore:
    def test_restore_nonexistent_ids_returns_error(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []
        result = archive_service.restore_records(db, ["nonexistent"])
        assert result["restored"] == 0
        assert len(result["errors"]) == 1

    def test_restore_existing_skips_without_force(self):
        db = MagicMock()

        archived = MagicMock(spec=object)
        archived.id = "arch-1"
        archived.table_name = "attendance"
        archived.data = {"id": "row-1", "school_id": "s-1", "created_at": "2020-01-01T00:00:00"}
        db.query.return_value.filter.return_value.all.return_value = [archived]

        existing = MagicMock()
        existing.id = "row-1"
        db.query.return_value.filter.return_value.execution_options.return_value.first.return_value = existing

        result = archive_service.restore_records(db, ["arch-1"], force=False)
        assert result["restored"] == 0
        assert len(result["errors"]) == 1
