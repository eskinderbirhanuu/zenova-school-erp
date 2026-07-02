import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, Integer, Boolean, DateTime, ForeignKey
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    account_number = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    account_type = Column(String(20), nullable=False)
    normal_side = Column(String(6), nullable=False)
    parent_id = Column(String(36), ForeignKey("accounts.id"), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
