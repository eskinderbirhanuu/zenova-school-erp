import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Index
from app.database import Base


class QRCode(Base):
    __tablename__ = "qr_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    encrypted_token = Column(String(500), nullable=False)
    reference_type = Column(String(50), nullable=False)
    reference_id = Column(String(36), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_qr_reference", "reference_type", "reference_id"),
    )
