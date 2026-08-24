from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database import Base


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
    PENDING = "pending"


class License(Base):
    __tablename__ = "licenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False)
    license_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    license_type: Mapped[LicenseType] = mapped_column(SAEnum(LicenseType), default=LicenseType.MAIN, nullable=False)
    status: Mapped[LicenseStatus] = mapped_column(SAEnum(LicenseStatus), default=LicenseStatus.PENDING, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="standard")
    seats: Mapped[int] = mapped_column(Integer, default=500)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    activated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_validated: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())