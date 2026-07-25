from datetime import datetime
from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class Update(Base):
    __tablename__ = "updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    version: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    changelog: Mapped[str] = mapped_column(Text, default="")
    file_path: Mapped[str] = mapped_column(String(500))
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    checksum: Mapped[str] = mapped_column(String(128))
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=False)
    min_version: Mapped[str] = mapped_column(String(50), default="0.0.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
