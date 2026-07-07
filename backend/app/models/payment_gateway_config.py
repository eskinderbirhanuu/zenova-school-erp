import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from app.database import Base


class PaymentGatewayConfig(Base):
    __tablename__ = "payment_gateway_configs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False, index=True)
    gateway = Column(String(50), nullable=False)
    secret_key = Column(String(500), nullable=True)
    public_key = Column(String(500), nullable=True)
    webhook_secret = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    config_json = Column(Text, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
