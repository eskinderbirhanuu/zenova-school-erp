import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey
from app.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    academic_year_id = Column(String(36), ForeignKey("academic_years.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    total_amount = Column(DECIMAL(15, 2), default=0.00)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)


class BudgetItem(Base):
    __tablename__ = "budget_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    budget_id = Column(String(36), ForeignKey("budgets.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id"), nullable=False)
    description = Column(String(500), nullable=False)
    planned_amount = Column(DECIMAL(15, 2), nullable=False)
    actual_amount = Column(DECIMAL(15, 2), default=0.00)
    deleted_at = Column(DateTime, nullable=True)
