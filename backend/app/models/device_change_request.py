import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey
from app.database import Base


class DeviceChangeRequest(Base):
    __tablename__ = "device_change_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    license_id = Column(String(36), ForeignKey("licenses.id"), nullable=False, index=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True, index=True)
    old_hardware_id = Column(String(255), nullable=False, comment="Stored hardware components before change")
    new_hardware_id = Column(String(255), nullable=True, comment="Submitted new hardware components (base64 JSON)")
    match_count = Column(Integer, nullable=False, comment="How many of 8 components matched at detection")
    total_components = Column(Integer, nullable=False, default=8)
    status = Column(String(20), nullable=False, default="pending", comment="pending / approved / rejected / auto_approved")
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(String(500), nullable=True)
    expires_at = Column(DateTime, nullable=False, comment="24h auto-approve deadline")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) > self.expires_at
