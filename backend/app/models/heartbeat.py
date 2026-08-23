import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Index
from app.database import Base


class SchoolHeartbeat(Base):
    """Org-side record of every heartbeat received from a school server.

    Powers the org's Schools Overview (online/offline, version, last-seen)
    and is the input to the remote-control directives returned to schools.
    """

    __tablename__ = "school_heartbeats"

    __table_args__ = (
        Index("ix_school_heartbeats_code_time", "school_code", "received_at"),
    )
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    server_id = Column(String(64), nullable=False, index=True)
    school_code = Column(String(64), nullable=False, index=True)
    server_role = Column(String(32), nullable=True)
    version = Column(String(64), nullable=True)
    license_key = Column(String(255), nullable=True, index=True)
    ip_address = Column(String(64), nullable=True)
    status = Column(String(16), nullable=False, default="ok")
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)