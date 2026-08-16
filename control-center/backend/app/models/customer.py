from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[str] = mapped_column(String(50), default="1.0.0")
    logo_url: Mapped[str] = mapped_column(String(500), default="")
    primary_color: Mapped[str] = mapped_column(String(20), default="#6366F1")
    secondary_color: Mapped[str] = mapped_column(String(20), default="#8B5CF6")
    accent_color: Mapped[str] = mapped_column(String(20), default="#EC4899")
    tagline: Mapped[str] = mapped_column(String(255), default="")
    features: Mapped[str] = mapped_column(Text, default="{}")
    local_url: Mapped[str] = mapped_column(String(500), default="")
    local_url_label: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
