import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DECIMAL, Text, DateTime, ForeignKey
from app.database import Base


class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sku = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(String(36), ForeignKey("inventory_categories.id"), nullable=True)
    unit = Column(String(50), nullable=True)
    quantity = Column(DECIMAL(15, 2), default=0.00)
    min_quantity = Column(DECIMAL(15, 2), default=0.00)
    unit_price = Column(DECIMAL(15, 2), default=0.00)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("inventory_items.id"), nullable=False)
    movement_type = Column(String(20), nullable=False)
    quantity = Column(DECIMAL(15, 2), nullable=False)
    reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
