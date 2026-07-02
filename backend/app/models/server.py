import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class ServerRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    MAIN_SCHOOL = "MAIN_SCHOOL"
    BRANCH = "BRANCH"


class ServerIdentity(Base):
    __tablename__ = "server_identities"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    server_id = Column(String(64), unique=True, nullable=False, index=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    parent_server_id = Column(String(64), nullable=True)
    fingerprint_sha256 = Column(String(128), unique=True, nullable=False)
    server_role = Column(SAEnum(ServerRole), nullable=False)
    vps_url = Column(String(500), nullable=True)
    is_trusted = Column(Boolean, default=False)
    sync_enabled = Column(Boolean, default=False)
    last_seen = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
