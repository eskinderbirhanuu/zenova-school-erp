"""Regression tests for the §3 audit-flush bug (P0).

Every model uses a flush-time UUID default (id = default=lambda: str(uuid.uuid4())),
so obj.id is None until flush. Several create-paths audit right after db.add(obj)
without flushing, which on a real DB (audit_logs.record_id formerly NOT NULL)
raised psycopg2.errors.NotNullViolation and broke /setup/school.

These tests use a real in-memory SQLite DB (not MagicMock) to prove:
  1. create_school / create_student flush before logging, so the audit row keeps a
     populated record_id (audit integrity preserved).
  2. log_audit tolerates a missing record id (the systemic fix: nullable column),
     so create-paths that cannot flush first degrade gracefully instead of crashing.
"""
import pytest
from datetime import date
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.audit_log import AuditLog
from app.models.school import School
from app.models.student import Student


@pytest.fixture
def real_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    yield db
    db.close()
    engine.dispose()


class TestAuditFlushOnCreate:
    def test_create_school_audits_with_populated_record_id(self, real_db):
        from app.services.license_service import create_school

        school = create_school(
            real_db,
            name="Regression School",
            code="REGSQL1",
            address="1 Test St",
        )

        assert school.id is not None
        audit = (
            real_db.query(AuditLog)
            .filter(AuditLog.table_name == "schools", AuditLog.action == "SCHOOL_CREATED")
            .first()
        )
        assert audit is not None
        assert audit.record_id == school.id
        assert audit.record_id is not None

    def test_create_student_audits_with_populated_record_id(self, real_db):
        from app.services.student_service import create_student

        student = create_student(
            real_db,
            student_id="REGSQL-001",
            first_name="Grace",
            middle_name="Brewster",
            last_name="Hopper",
            gender="F",
            date_of_birth=date(1906, 12, 9),
            school_id="school-1",
        )

        assert student.id is not None
        audit = (
            real_db.query(AuditLog)
            .filter(AuditLog.table_name == "students", AuditLog.action == "STUDENT_CREATED")
            .first()
        )
        assert audit is not None
        assert audit.record_id == student.id
        assert audit.record_id is not None

    def test_log_audit_accepts_missing_record_id(self, real_db):
        from app.core.audit import log_audit

        log_audit(
            real_db,
            user_id="system",
            action="CREATE",
            table_name="some_entity",
            record_id=None,
            description="No record id available before flush",
        )

        audit = (
            real_db.query(AuditLog)
            .filter(AuditLog.table_name == "some_entity")
            .first()
        )
        assert audit is not None
        assert audit.record_id is None
