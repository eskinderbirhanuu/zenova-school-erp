import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from app.database import Base


PASSWORD_HISTORY_LIMIT = 5  # prevent reuse of last 5 passwords


class PasswordHistory(Base):
    __tablename__ = "password_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="password_history")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), unique=True, nullable=True, index=True, comment="Employee number for login")
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_view_only = Column(Boolean, default=False)
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255), nullable=True)
    mfa_backup_codes = Column(Text, nullable=True)
    must_change_password = Column(Boolean, default=False)
    last_login_at = Column(DateTime, nullable=True)
    role_id = Column(String(36), ForeignKey("roles.id"), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True)
    branch_id = Column(String(36), ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    role = relationship("Role", back_populates="users")
    school = relationship("School", back_populates="users", foreign_keys=[school_id])
    branch = relationship("Branch", back_populates="users")
    password_history = relationship("PasswordHistory", back_populates="user", order_by="PasswordHistory.created_at.desc()")
