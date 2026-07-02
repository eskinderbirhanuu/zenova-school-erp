import uuid
from datetime import datetime, timezone, date
from sqlalchemy import Column, String, DECIMAL, Text, Date, DateTime, ForeignKey
from app.database import Base


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    pr_number = Column(String(50), nullable=False)
    requested_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    department = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    estimated_amount = Column(DECIMAL(15, 2), nullable=True)
    status = Column(String(20), default="draft")
    approved_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    po_number = Column(String(50), nullable=False)
    purchase_request_id = Column(String(36), ForeignKey("purchase_requests.id"), nullable=True)
    supplier = Column(String(255), nullable=False)
    total_amount = Column(DECIMAL(15, 2), nullable=True)
    status = Column(String(20), default="draft")
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)


class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    gr_number = Column(String(50), nullable=False)
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id"), nullable=False)
    school_id = Column(String(36), ForeignKey("schools.id"), nullable=False)
    received_by = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    deleted_at = Column(DateTime, nullable=True)
