import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class LicenseType(str, enum.Enum):
    MAIN = "main"
    BRANCH = "branch"
    TRIAL = "trial"
    MONTHLY = "monthly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"


class LicenseStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"


class License(Base):
    __tablename__ = "licenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False, index=True)
    license_type = Column(SAEnum(LicenseType), nullable=False)
    status = Column(SAEnum(LicenseStatus), default=LicenseStatus.ACTIVE)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    valid_from = Column(DateTime, nullable=False, default=datetime.utcnow)
    valid_until = Column(DateTime, nullable=True)
    max_users = Column(String(50), nullable=True)
    machine_fingerprint = Column(String(128), nullable=True, index=True, comment="SHA-256 machine fingerprint for hardware binding")
    hardware_id = Column(String(255), nullable=True, comment="Base64 encoded hardware identifiers")
    offline_grace_start = Column(DateTime, nullable=True, comment="When offline period started (45-day grace)")
    last_online_validation = Column(DateTime, nullable=True, comment="Last successful online license check")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    school = relationship("School")
    branch = relationship("Branch")
