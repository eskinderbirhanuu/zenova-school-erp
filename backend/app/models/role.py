import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    __table_args__ = (
        UniqueConstraint("school_id", "name", name="uq_role_school_name"),
    )
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    level = Column(String(10), nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)

    users = relationship("User", back_populates="role")
    user_assignments = relationship("UserRole", back_populates="role", lazy="dynamic", foreign_keys="UserRole.role_id")
    permission_assignments = relationship("RolePermission", back_populates="role", lazy="dynamic", cascade="all, delete-orphan")
