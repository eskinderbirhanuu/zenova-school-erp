import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, Boolean, DateTime
from app.database import Base


class Currency(Base):
    __tablename__ = "currencies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(3), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    exchange_rate_to_etb = Column(DECIMAL(15, 6), nullable=False, default=1.0)
    is_base = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
