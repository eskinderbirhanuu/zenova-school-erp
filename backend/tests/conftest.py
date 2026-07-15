from datetime import date, datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, PropertyMock, patch, ANY, AsyncMock
from typing import Optional
import pytest


# ── DB Fixtures ──────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.query.return_value.filter.return_value.count.return_value = 0
    db.query.return_value.filter.return_value.order_by.return_value.count.return_value = 0
    db.query.return_value.filter.return_value.first.return_value = None
    db.query.return_value.filter.return_value.all.return_value = []
    db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
    db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = []
    return db


@pytest.fixture
def mock_db_with_user(mock_db):
    from app.models.user import User
    user = User(id="user-1", email="admin@zenova.app", full_name="Admin", is_active=True)
    mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = user
    return mock_db


# ── Model Builders ───────────────────────────────────────────

def make_user(id="user-1", email="test@zenova.app", full_name="Test User",
              is_active=True, is_superuser=False, role_name="ADMIN"):
    role = MagicMock()
    role.name = role_name
    user = MagicMock()
    user.id = id
    user.email = email
    user.full_name = full_name
    user.is_active = is_active
    user.is_superuser = is_superuser
    user.hashed_password = "$2b$12$" + "x" * 53
    user.role = role
    user.phone = "+251911111111"
    return user


def make_student(id="student-1", first_name="Alice", last_name="Smith",
                 school_id="school-1", grade_id="grade-1", status="active",
                 student_id="STU-00001"):
    student = MagicMock()
    student.id = id
    student.student_id = student_id
    student.first_name = first_name
    student.last_name = last_name
    student.grade_id = grade_id
    student.school_id = school_id
    student.status = status
    return student


def make_invoice(id="inv-1", student_id="student-1", school_id="school-1",
                 total_amount=Decimal("100"), paid_amount=Decimal("0"),
                 status="pending", due_date=None):
    inv = MagicMock()
    inv.id = id
    inv.student_id = student_id
    inv.school_id = school_id
    inv.total_amount = total_amount
    inv.paid_amount = paid_amount
    inv.status = status
    inv.due_date = due_date or date(2026, 7, 15)
    inv.issue_date = date(2026, 7, 1)
    inv.invoice_number = f"INV-{id}"
    return inv


def make_payment(id="pay-1", amount=Decimal("50"), payment_method="cash",
                 student_id="student-1", school_id="school-1",
                 payment_date=None):
    pmt = MagicMock()
    pmt.id = id
    pmt.amount = amount
    pmt.payment_method = payment_method
    pmt.student_id = student_id
    pmt.school_id = school_id
    pmt.payment_date = payment_date or date(2026, 7, 10)
    pmt.created_at = datetime.now(timezone.utc)
    return pmt


def make_parent(id="parent-1", full_name="Parent User", user_id="user-2",
                school_id="school-1", phone="+251911111111"):
    parent = MagicMock()
    parent.id = id
    parent.full_name = full_name
    parent.user_id = user_id
    parent.school_id = school_id
    parent.phone = phone
    return parent


def make_academic_year(id="ay-1", name="2025/26", school_id="school-1",
                       start_date=None, end_date=None):
    ay = MagicMock()
    ay.id = id
    ay.name = name
    ay.school_id = school_id
    ay.start_date = start_date or date(2025, 9, 1)
    ay.end_date = end_date or date(2026, 7, 31)
    return ay


def make_class_grade(id="grade-1", name="Grade 10", school_id="school-1"):
    cls = MagicMock()
    cls.id = id
    cls.name = name
    cls.school_id = school_id
    return cls


def make_account(id="acct-1", name="Cash", account_number="1000",
                 account_type="asset", normal_side="debit",
                 school_id="school-1", is_active=True):
    acct = MagicMock()
    acct.id = id
    acct.name = name
    acct.account_number = account_number
    acct.account_type = account_type
    acct.normal_side = normal_side
    acct.school_id = school_id
    acct.is_active = is_active
    return acct


# ── Patch Helpers ────────────────────────────────────────────

@pytest.fixture
def patch_audit():
    """Prevent log_audit from causing test failures.
    Use by listing 'patch_audit' in a test's parameter list."""
    with patch("app.core.audit.log_audit") as mock:
        mock.return_value = None
        yield mock


@pytest.fixture
def mock_redis():
    redis = MagicMock()
    redis.get.return_value = None
    redis.setex.return_value = True
    redis.delete.return_value = True
    return redis
