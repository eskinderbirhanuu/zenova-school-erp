from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.cafeteria import CafeteriaProduct, CafeteriaOrder, CafeteriaOrderItem
from app.core.audit import log_audit
from app.services.sync_service import enqueue_sync


def create_product(db: Session, school_id: str, data, user_id: str):
    p = CafeteriaProduct(name=data.name, price=Decimal(str(data.price)), category=data.category,
                         stock=data.stock, school_id=school_id)
    db.add(p)
    log_audit(db, user_id, "CAFETERIA_PRODUCT_CREATED", "cafeteria_product", p.id, f"Product '{data.name}'", school_id=school_id)
    db.commit()
    db.refresh(p)
    enqueue_sync(db, "cafeteria_products", p.id, "CREATE",
                 {"name": data.name, "price": str(p.price), "school_id": school_id},
                 school_id)
    return p


def get_products(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_order(db: Session, school_id: str, data, user_id: str):
    total = Decimal("0.00")
    items = []
    for item in data.items:
        product = db.query(CafeteriaProduct).filter(
            CafeteriaProduct.id == item.product_id,
            CafeteriaProduct.school_id == school_id,
        ).with_for_update().first()
        if not product: raise HTTPException(404, f"Product {item.product_id} not found")
        if product.stock < item.quantity: raise HTTPException(400, f"Insufficient stock for {product.name}")
        line_total = product.price * item.quantity
        total += line_total
        items.append(CafeteriaOrderItem(product_id=item.product_id, quantity=item.quantity, unit_price=product.price))
        product.stock -= item.quantity
    if data.payment_method == "wallet" and data.customer_id:
        from app.models.wallet import Wallet
        wallet = db.query(Wallet).filter(
            Wallet.school_id == school_id,
            Wallet.student_id == data.customer_id,
        ).with_for_update().first()
        if wallet and wallet.balance < total:
            raise HTTPException(400, f"Insufficient wallet balance ({wallet.balance}) for order total ({total})")
    order = CafeteriaOrder(customer_type=data.customer_type, customer_id=data.customer_id,
                           total=total, payment_method=data.payment_method, school_id=school_id, created_by=user_id)
    db.add(order); db.flush()
    for it in items: it.order_id = order.id; db.add(it)
    log_audit(db, user_id, "CAFETERIA_ORDER_CREATED", "cafeteria_order", order.id, f"Order total: {total}", school_id=school_id)
    db.commit()
    db.refresh(order)
    enqueue_sync(db, "cafeteria_orders", order.id, "CREATE",
                 {"total": str(total), "payment_method": data.payment_method, "school_id": school_id},
                 school_id)
    return order


def get_orders(db: Session, school_id: str):
    return db.query(CafeteriaOrder).filter(CafeteriaOrder.school_id == school_id).order_by(CafeteriaOrder.created_at.desc()).all()


def update_product(db: Session, product_id: str, school_id: str, data, user_id: str, include_deleted: bool = False):
    q = db.query(CafeteriaProduct).filter(CafeteriaProduct.id == product_id, CafeteriaProduct.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    p = q.first()
    if not p:
        raise HTTPException(404, "Product not found")
    if data.name is not None:
        p.name = data.name
    if data.price is not None:
        p.price = Decimal(str(data.price))
    if data.category is not None:
        p.category = data.category
    if data.stock is not None:
        p.stock = data.stock
    log_audit(db, user_id, "CAFETERIA_PRODUCT_UPDATED", "cafeteria_product", p.id, f"Product '{p.name}'", school_id=school_id)
    db.commit()
    db.refresh(p)
    return p


def delete_product(db: Session, product_id: str, school_id: str, user_id: str, include_deleted: bool = False):
    q = db.query(CafeteriaProduct).filter(CafeteriaProduct.id == product_id, CafeteriaProduct.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    p = q.first()
    if not p:
        raise HTTPException(404, "Product not found")
    p.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "CAFETERIA_PRODUCT_DELETED", "cafeteria_product", product_id, f"Product '{p.name}'", school_id=school_id)
    db.commit()
    return {"ok": True}


def update_order_status(db: Session, order_id: str, school_id: str, status: str, user_id: str):
    VALID_STATUSES = {"pending", "preparing", "ready", "delivered", "cancelled"}
    if status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}")
    order = db.query(CafeteriaOrder).filter(CafeteriaOrder.id == order_id, CafeteriaOrder.school_id == school_id).first()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status == "cancelled":
        raise HTTPException(400, "Cannot update a cancelled order")
    order.status = status
    log_audit(db, user_id, "CAFETERIA_ORDER_STATUS_CHANGED", "cafeteria_order", order.id, f"Status: {status}", school_id=school_id)
    db.commit()
    db.refresh(order)
    return order
