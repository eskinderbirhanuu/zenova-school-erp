from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.cafeteria import CafeteriaProduct, CafeteriaOrder, CafeteriaOrderItem
from app.core.audit import log_audit


def create_product(db: Session, school_id: str, data, user_id: str):
    p = CafeteriaProduct(name=data.name, price=Decimal(str(data.price)), category=data.category,
                         stock=data.stock, school_id=school_id)
    db.add(p); db.commit(); db.refresh(p)
    log_audit(db, user_id, "CAFETERIA_PRODUCT_CREATED", "cafeteria_product", p.id, f"Product '{data.name}'")
    return p


def get_products(db: Session, school_id: str):
    return db.query(CafeteriaProduct).filter(CafeteriaProduct.school_id == school_id).all()


def create_order(db: Session, school_id: str, data, user_id: str):
    total = Decimal("0.00")
    items = []
    for item in data.items:
        product = db.query(CafeteriaProduct).filter(CafeteriaProduct.id == item.product_id).first()
        if not product: raise HTTPException(404, f"Product {item.product_id} not found")
        if product.stock < item.quantity: raise HTTPException(400, f"Insufficient stock for {product.name}")
        line_total = product.price * item.quantity
        total += line_total
        items.append(CafeteriaOrderItem(product_id=item.product_id, quantity=item.quantity, unit_price=product.price))
        product.stock -= item.quantity
    order = CafeteriaOrder(customer_type=data.customer_type, customer_id=data.customer_id,
                           total=total, payment_method=data.payment_method, school_id=school_id, created_by=user_id)
    db.add(order); db.flush()
    for it in items: it.order_id = order.id; db.add(it)
    db.commit(); db.refresh(order)
    log_audit(db, user_id, "CAFETERIA_ORDER_CREATED", "cafeteria_order", order.id, f"Order total: {total}")
    return order


def get_orders(db: Session, school_id: str):
    return db.query(CafeteriaOrder).filter(CafeteriaOrder.school_id == school_id).order_by(CafeteriaOrder.created_at.desc()).all()


def update_product(db: Session, product_id: str, school_id: str, data, user_id: str):
    p = db.query(CafeteriaProduct).filter(CafeteriaProduct.id == product_id, CafeteriaProduct.school_id == school_id).first()
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
    db.commit()
    db.refresh(p)
    log_audit(db, user_id, "CAFETERIA_PRODUCT_UPDATED", "cafeteria_product", p.id, f"Product '{p.name}'")
    return p


def delete_product(db: Session, product_id: str, school_id: str, user_id: str):
    p = db.query(CafeteriaProduct).filter(CafeteriaProduct.id == product_id, CafeteriaProduct.school_id == school_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    db.delete(p)
    db.commit()
    log_audit(db, user_id, "CAFETERIA_PRODUCT_DELETED", "cafeteria_product", product_id, f"Product '{p.name}'")
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
    db.commit()
    db.refresh(order)
    log_audit(db, user_id, "CAFETERIA_ORDER_STATUS_CHANGED", "cafeteria_order", order.id, f"Status: {status}")
    return order
