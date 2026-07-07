import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class StaffCard(Base):
    __tablename__ = "staff_cards"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    staff_profile_id = Column(String(36), ForeignKey("staff_profiles.id"), nullable=False, index=True)
    card_uid = Column(String(100), unique=True, nullable=False, index=True)
    card_tier = Column(String(20), default="standard")
    status = Column(String(20), default="active")
    issue_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expiry_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
