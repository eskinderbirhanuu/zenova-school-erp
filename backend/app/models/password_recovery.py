import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, Integer, ForeignKey
from app.database import Base


class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    initiated_by = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    method = Column(String(50), nullable=False, comment="temp_password|recovery_code|emergency|email|admin")
    status = Column(String(20), nullable=False, default="pending", comment="pending|approved|completed|cancelled|expired")
    token_hash = Column(String(255), nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    temp_password_hash = Column(String(255), nullable=True)
    reason = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    device_info = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String(255), nullable=False)
    code_prefix = Column(String(8), nullable=False, comment="First 8 chars for display")
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    used_by_ip = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)


class PasswordAudit(Base):
    __tablename__ = "password_audit"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True, index=True)
    action = Column(String(50), nullable=False, index=True, comment="reset_requested|reset_completed|temp_password_generated|recovery_codes_generated|code_verified|emergency_recovery")
    target_user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    initiated_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    approved_by_user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    deleted_at = Column(DateTime, nullable=True)
