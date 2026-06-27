import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DECIMAL, Text, DateTime, ForeignKey
from app.database import Base


class CafeteriaProduct(Base):
    __tablename__ = "cafeteria_products"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    price = Column(DECIMAL(10, 2), nullable=False)
    category = Column(String(100), nullable=True)
    stock = Column(Integer, default=0)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CafeteriaOrder(Base):
    __tablename__ = "cafeteria_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_type = Column(String(20), nullable=False)
    customer_id = Column(String(36), nullable=True)
    total = Column(DECIMAL(10, 2), nullable=False)
    status = Column(String(20), default="completed")
    payment_method = Column(String(50), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class CafeteriaOrderItem(Base):
    __tablename__ = "cafeteria_order_items"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String(36), ForeignKey("cafeteria_orders.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("cafeteria_products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(DECIMAL(10, 2), nullable=False)
