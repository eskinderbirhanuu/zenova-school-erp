from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.exceptions import NotFoundException, BadRequestException
from app.models.inventory import InventoryCategory, InventoryItem, StockMovement, Supplier
from app.core.audit import log_audit


def create_category(db: Session, school_id: str, data, user_id: str):
    cat = InventoryCategory(name=data.name, description=data.description, school_id=school_id)
    db.add(cat)
    log_audit(db, user_id, "INVENTORY_CATEGORY_CREATED", "inventory_category", cat.id, f"Category '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(cat)
    return cat


def get_categories(db: Session, school_id: str, include_deleted: bool = False):
    q = db.query(InventoryCategory).filter(InventoryCategory.school_id == school_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    return q.all()


def create_item(db: Session, school_id: str, data, user_id: str):
    item = InventoryItem(
        sku=data.sku, name=data.name, description=data.description,
        category_id=data.category_id, unit=data.unit,
        quantity=Decimal(str(data.quantity)), min_quantity=Decimal(str(data.min_quantity)),
        unit_price=Decimal(str(data.unit_price)), school_id=school_id,
    )
    db.add(item)
    log_audit(db, user_id, "INVENTORY_ITEM_CREATED", "inventory_item", item.id, f"Item '{data.name}' (SKU: {data.sku}) created", school_id=school_id)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: str, data, user_id: str, school_id: str = None):
    q = db.query(InventoryItem).filter(InventoryItem.id == item_id)
    if school_id:
        q = q.filter(InventoryItem.school_id == school_id)
    item = q.first()
    if not item:
        raise NotFoundException("Item not found")
    if data.name is not None:
        item.name = data.name
    if data.description is not None:
        item.description = data.description
    if data.category_id is not None:
        item.category_id = data.category_id
    if data.unit is not None:
        item.unit = data.unit
    if data.min_quantity is not None:
        item.min_quantity = Decimal(str(data.min_quantity))
    if data.unit_price is not None:
        item.unit_price = Decimal(str(data.unit_price))
    log_audit(db, user_id, "INVENTORY_ITEM_UPDATED", "inventory_item", item_id, f"Item '{item.name}' updated", school_id=school_id)
    db.commit()
    db.refresh(item)
    return item


def get_items(db: Session, school_id: str, category_id: str = None, low_stock: bool = False):
    q = db.query(InventoryItem).filter(InventoryItem.school_id == school_id)
    if category_id:
        q = q.filter(InventoryItem.category_id == category_id)
    if low_stock:
        q = q.filter(InventoryItem.quantity <= InventoryItem.min_quantity)
    return q.order_by(InventoryItem.name).all()


def record_movement(db: Session, school_id: str, data, user_id: str):
    item = db.query(InventoryItem).filter(InventoryItem.id == data.item_id, InventoryItem.school_id == school_id).first()
    if not item:
        raise NotFoundException("Item not found")
    qty = Decimal(str(data.quantity))
    if data.movement_type in ("out", "adjustment_down") and item.quantity < qty:
        raise BadRequestException("Insufficient stock")
    movement = StockMovement(
        item_id=data.item_id, movement_type=data.movement_type, quantity=qty,
        reference=data.reference, notes=data.notes, school_id=school_id, created_by=user_id,
    )
    if data.movement_type in ("in", "return"):
        item.quantity += qty
    elif data.movement_type in ("out", "issue"):
        item.quantity -= qty
    elif data.movement_type == "adjustment_up":
        item.quantity += qty
    elif data.movement_type == "adjustment_down":
        item.quantity -= qty
    db.add(movement)
    log_audit(db, user_id, "STOCK_MOVEMENT", "stock_movement", movement.id,
              f"{data.movement_type}: {qty} of item {data.item_id}", school_id=school_id)
    db.commit()
    db.refresh(movement)
    return movement


def get_movements(db: Session, school_id: str, item_id: str = None):
    q = db.query(StockMovement).filter(StockMovement.school_id == school_id)
    if item_id:
        q = q.filter(StockMovement.item_id == item_id)
    return q.order_by(StockMovement.created_at.desc()).all()


def create_supplier(db: Session, school_id: str, data, user_id: str):
    s = Supplier(name=data.name, contact_person=data.contact_person, phone=data.phone, email=data.email, address=data.address, school_id=school_id)
    db.add(s)
    log_audit(db, user_id, "SUPPLIER_CREATED", "supplier", s.id, f"Supplier '{data.name}' created", school_id=school_id)
    db.commit()
    db.refresh(s)
    return s


def get_suppliers(db: Session, school_id: str):
    return db.query(Supplier).filter(Supplier.school_id == school_id).all()


def update_category(db: Session, category_id: str, data, user_id: str, school_id: str = None, include_deleted: bool = False):
    q = db.query(InventoryCategory).filter(InventoryCategory.id == category_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(InventoryCategory.school_id == school_id)
    cat = q.first()
    if not cat:
        raise NotFoundException("Category not found")
    if data.name is not None:
        cat.name = data.name
    if data.description is not None:
        cat.description = data.description
    log_audit(db, user_id, "INVENTORY_CATEGORY_UPDATED", "inventory_category", category_id, f"Category updated to '{cat.name}'", school_id=school_id)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: str, user_id: str, school_id: str = None, include_deleted: bool = False):
    q = db.query(InventoryCategory).filter(InventoryCategory.id == category_id)
    if include_deleted:
        q = q.execution_options(include_deleted=True)
    if school_id:
        q = q.filter(InventoryCategory.school_id == school_id)
    cat = q.first()
    if not cat:
        raise NotFoundException("Category not found")
    cat.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "INVENTORY_CATEGORY_DELETED", "inventory_category", category_id, "Category deleted", school_id=school_id)
    db.commit()


def update_supplier(db: Session, supplier_id: str, data, user_id: str, school_id: str = None):
    q = db.query(Supplier).filter(Supplier.id == supplier_id)
    if school_id:
        q = q.filter(Supplier.school_id == school_id)
    s = q.first()
    if not s:
        raise NotFoundException("Supplier not found")
    if data.name is not None:
        s.name = data.name
    if data.contact_person is not None:
        s.contact_person = data.contact_person
    if data.phone is not None:
        s.phone = data.phone
    if data.email is not None:
        s.email = data.email
    if data.address is not None:
        s.address = data.address
    log_audit(db, user_id, "SUPPLIER_UPDATED", "supplier", supplier_id, f"Supplier '{s.name}' updated", school_id=school_id)
    db.commit()
    db.refresh(s)
    return s


def delete_supplier(db: Session, supplier_id: str, user_id: str, school_id: str = None):
    q = db.query(Supplier).filter(Supplier.id == supplier_id)
    if school_id:
        q = q.filter(Supplier.school_id == school_id)
    s = q.first()
    if not s:
        raise NotFoundException("Supplier not found")
    s.deleted_at = datetime.now(timezone.utc)
    log_audit(db, user_id, "SUPPLIER_DELETED", "supplier", supplier_id, "Supplier deleted", school_id=school_id)
    db.commit()
