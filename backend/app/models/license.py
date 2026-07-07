import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class LicenseType(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
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
    REVIEW_MODE = "review_mode"
    DEVICE_LOCKED = "device_locked"


class License(Base):
    __tablename__ = "licenses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String(255), unique=True, nullable=False, index=True)
    license_type = Column(SAEnum(LicenseType), nullable=False)
    status = Column(SAEnum(LicenseStatus), default=LicenseStatus.ACTIVE)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    valid_from = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    valid_until = Column(DateTime, nullable=True)
    max_users = Column(String(50), nullable=True)
    machine_fingerprint = Column(String(128), nullable=True, index=True, comment="SHA-256 machine fingerprint for hardware binding")
    hardware_id = Column(String(255), nullable=True, comment="Base64 encoded hardware identifiers")
    offline_grace_start = Column(DateTime, nullable=True, comment="When offline period started (45-day grace)")
    last_online_validation = Column(DateTime, nullable=True, comment="Last successful online license check")
    device_change_reason = Column(String(255), nullable=True, comment="Why review mode was triggered (3-5 or 6-8 component change)")
    device_change_requested_at = Column(DateTime, nullable=True, comment="When review mode was entered")
    tpm_sealed_data = Column(String(512), nullable=True, comment="TPM-sealed machine fingerprint for enhanced binding")
    runtime_environment = Column(String(20), nullable=True, comment="Detected runtime: bare_metal, vm, docker, unknown")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    school = relationship("School")
    branch = relationship("Branch")
