import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DECIMAL, DateTime, ForeignKey
from app.database import Base


class InventoryAsset(Base):
    __tablename__ = "inventory_assets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    value = Column(DECIMAL(15, 2), default=0.00)
    location = Column(String(255), nullable=True)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
