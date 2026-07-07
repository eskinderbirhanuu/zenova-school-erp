import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey
from app.database import Base


class NfcScanLog(Base):
    __tablename__ = "nfc_scan_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    card_uid = Column(String(100), nullable=False, index=True)
    reference_type = Column(String(20), nullable=False)
    reference_id = Column(String(36), nullable=False)
    scan_type = Column(String(20), nullable=False)
    scanned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reader_location = Column(String(100), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
