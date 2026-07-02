import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from app.config import settings
from app.models.archive import ArchiveJob, ArchivedRecord

ARCHIVABLE_TABLES = {
    "attendance": {"retention_days": settings.archive_retention_attendance_days},
    "notifications": {"retention_days": settings.archive_retention_notifications_days},
    "audit_logs": {"retention_days": settings.archive_retention_audit_logs_days},
    "sync_queue": {"retention_days": settings.archive_retention_sync_queue_days, "synced_only": True},
}

TABLE_MODEL_MAP = {
    "attendance": "Attendance",
    "notifications": "Notification",
    "audit_logs": "AuditLog",
    "sync_queue": "SyncQueue",
}

TABLE_PK_MAP = {
    "attendance": "id",
    "notifications": "id",
    "audit_logs": "id",
    "sync_queue": "id",
}

TABLE_DATE_FILTER = {
    "attendance": "created_at",
    "notifications": "created_at",
    "audit_logs": "created_at",
    "sync_queue": "created_at",
}


def get_archive_status(db: Session) -> list:
    jobs = db.query(ArchiveJob).order_by(ArchiveJob.started_at.desc()).limit(20).all()
    return [
        {
            "id": j.id,
            "table_name": j.table_name,
            "cutoff_date": j.cutoff_date.isoformat() if j.cutoff_date else None,
            "total_candidates": j.total_candidates,
            "archived_count": j.archived_count,
            "skipped_count": j.skipped_count,
            "status": j.status,
            "error_message": j.error_message,
            "started_at": j.started_at.isoformat() if j.started_at else None,
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


def get_table_sizes(db: Session) -> list:
    sizes = []
    for table_name in ARCHIVABLE_TABLES:
        model_name = TABLE_MODEL_MAP.get(table_name)
        if not model_name:
            continue
        try:
            model_cls = _resolve_model(model_name)
            count = db.query(func.count(model_cls.id)).scalar() or 0
            sizes.append({"table": table_name, "row_count": count})
        except Exception:
            sizes.append({"table": table_name, "row_count": -1})
    return sizes


def run_archive(db: Session, table_name: str = None, user_id: str = None) -> dict:
    tables_to_archive = [table_name] if table_name else list(ARCHIVABLE_TABLES.keys())
    results = []

    for tbl in tables_to_archive:
        cfg = ARCHIVABLE_TABLES.get(tbl)
        if not cfg:
            results.append({"table": tbl, "error": "Not an archivable table"})
            continue

        model_cls = _resolve_model(TABLE_MODEL_MAP.get(tbl))
        if not model_cls:
            results.append({"table": tbl, "error": "Model not found"})
            continue

        pk_col = TABLE_PK_MAP.get(tbl)
        date_col = TABLE_DATE_FILTER.get(tbl)
        cutoff = datetime.now(timezone.utc) - timedelta(days=cfg["retention_days"])

        q = db.query(model_cls)
        if cfg.get("synced_only"):
            q = q.filter(model_cls.status == "synced")
        q = q.filter(getattr(model_cls, date_col) < cutoff)

        candidates = q.all()
        total = len(candidates)
        archived = 0
        skipped = 0

        job = ArchiveJob(
            table_name=tbl,
            cutoff_date=cutoff,
            total_candidates=total,
            status="running",
            created_by=user_id,
        )
        db.add(job)
        db.flush()

        for row in candidates:
            try:
                record_data = _serialize_row(row, tbl)
                archive_entry = ArchivedRecord(
                    job_id=job.id,
                    table_name=tbl,
                    record_id=getattr(row, pk_col),
                    school_id=getattr(row, "school_id", None),
                    data=record_data,
                )
                db.add(archive_entry)
                db.delete(row)
                archived += 1
            except Exception:
                skipped += 1

        job.archived_count = archived
        job.skipped_count = skipped
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)

        db.commit()
        results.append({
            "table": tbl,
            "cutoff": cutoff.isoformat(),
            "total_candidates": total,
            "archived": archived,
            "skipped": skipped,
        })

    return {"results": results}


def restore_records(db: Session, archive_ids: list[str], force: bool = False) -> dict:
    import uuid

    restored = 0
    errors = []

    records = db.query(ArchivedRecord).filter(ArchivedRecord.id.in_(archive_ids)).all()
    if not records:
        return {"restored": 0, "errors": ["No matching archived records found"]}

    for rec in records:
        try:
            model_cls = _resolve_model(TABLE_MODEL_MAP.get(rec.table_name))
            if not model_cls:
                errors.append({"id": rec.id, "error": f"Unknown table {rec.table_name}"})
                continue

            row_data = dict(rec.data)
            pk_col = TABLE_PK_MAP.get(rec.table_name)
            original_id = row_data.get(pk_col)

            existing = None
            if original_id:
                existing = db.query(model_cls).filter(
                    getattr(model_cls, pk_col) == original_id
                ).execution_options(include_deleted=True).first()

            if existing and not force:
                errors.append({
                    "id": rec.id,
                    "error": f"Record {original_id} already exists in {rec.table_name}. Use force=true to overwrite.",
                })
                continue

            if existing and force:
                for key, val in row_data.items():
                    setattr(existing, key, val)
                db.delete(rec)
                restored += 1
                continue

            row_data.pop("deleted_at", None)

            instance = model_cls(**row_data)
            db.add(instance)
            db.delete(rec)
            restored += 1
        except Exception as e:
            errors.append({"id": rec.id, "error": str(e)})

    db.commit()
    return {"restored": restored, "errors": errors}


def _resolve_model(model_name: str):
    import app.models as models
    return getattr(models, model_name, None)


def _serialize_row(row, table_name: str) -> dict:
    data = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            data[col.name] = val.isoformat()
        else:
            data[col.name] = val
    return data
