from datetime import datetime
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

class Heartbeat(Base):
    __tablename__ = "heartbeats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(Integer, ForeignKey("customers.id"), nullable=False)
    version: Mapped[str] = mapped_column(String(50))
    uptime: Mapped[float] = mapped_column(Float)
    cpu_percent: Mapped[float] = mapped_column(Float)
    memory_percent: Mapped[float] = mapped_column(Float)
    disk_percent: Mapped[float] = mapped_column(Float)
    db_status: Mapped[str] = mapped_column(String(20), default="ok")
    redis_status: Mapped[str] = mapped_column(String(20), default="ok")
    recorded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
