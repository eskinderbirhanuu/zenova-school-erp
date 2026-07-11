from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_permission, Permission
from app.schemas.inventory import (
    InventoryCategoryCreate, InventoryCategoryUpdate, InventoryCategoryResponse,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    StockMovementCreate, StockMovementResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse,
)
from app.schemas.pagination import PaginatedResponse
from app.core.pagination import paginate, build_paginated_response
from app.services import inventory_service
from app.models.inventory import InventoryItem

from app.models.inventory_asset import InventoryAsset

router = APIRouter()
INVENTORY = [require_permission(Permission.INVENTORY_MANAGE)]
VIEW_INVENTORY = [require_permission(Permission.INVENTORY_MANAGE, Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS)]


@router.post("/inventory/categories", response_model=InventoryCategoryResponse, dependencies=INVENTORY)
def create_category(data: InventoryCategoryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_category(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/categories", response_model=list[InventoryCategoryResponse], dependencies=VIEW_INVENTORY)
def list_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    include_deleted = current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN'))
    return inventory_service.get_categories(db, current_user.school_id, include_deleted=include_deleted)


@router.patch("/inventory/categories/{category_id}", response_model=InventoryCategoryResponse, dependencies=INVENTORY)
def update_category(category_id: str, data: InventoryCategoryUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_category(db, category_id, data, current_user.id, current_user.school_id, include_deleted=True)


@router.delete("/inventory/categories/{category_id}", dependencies=INVENTORY)
def delete_category(category_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    inventory_service.delete_category(db, category_id, current_user.id, current_user.school_id, include_deleted=True)
    return {"message": "Category deleted"}


@router.post("/inventory/items", response_model=InventoryItemResponse, dependencies=INVENTORY)
def create_item(data: InventoryItemCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_item(db, current_user.school_id, data, current_user.id)


@router.patch("/inventory/items/{item_id}", response_model=InventoryItemResponse, dependencies=INVENTORY)
def update_item(item_id: str, data: InventoryItemUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_item(db, item_id, data, current_user.id, current_user.school_id)


@router.get("/inventory/items", dependencies=VIEW_INVENTORY)
def list_items(
    category_id: str = Query(None), low_stock: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    q = db.query(InventoryItem).filter(InventoryItem.school_id == current_user.school_id)
    if category_id:
        q = q.filter(InventoryItem.category_id == category_id)
    if low_stock:
        q = q.filter(InventoryItem.quantity <= InventoryItem.reorder_level)
    q = q.order_by(InventoryItem.name)
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[InventoryItemResponse.model_validate(i) for i in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/inventory/stock-movements", response_model=StockMovementResponse, dependencies=INVENTORY)
def record_movement(data: StockMovementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.record_movement(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/stock-movements", dependencies=VIEW_INVENTORY)
def list_movements(
    item_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    from app.models.inventory import StockMovement
    q = db.query(StockMovement).filter(StockMovement.school_id == current_user.school_id)
    if item_id:
        q = q.filter(StockMovement.item_id == item_id)
    q = q.order_by(StockMovement.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[StockMovementResponse.model_validate(m) for m in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/inventory/suppliers", response_model=SupplierResponse, dependencies=INVENTORY)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_supplier(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/suppliers", response_model=list[SupplierResponse], dependencies=VIEW_INVENTORY)
def list_suppliers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.get_suppliers(db, current_user.school_id)


@router.patch("/inventory/suppliers/{supplier_id}", response_model=SupplierResponse, dependencies=INVENTORY)
def update_supplier(supplier_id: str, data: SupplierUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_supplier(db, supplier_id, data, current_user.id, current_user.school_id)


@router.delete("/inventory/suppliers/{supplier_id}", dependencies=INVENTORY)
def delete_supplier(supplier_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    inventory_service.delete_supplier(db, supplier_id, current_user.id, current_user.school_id)
    return {"message": "Supplier deleted"}


@router.get("/inventory/assets", dependencies=VIEW_INVENTORY)
def list_assets(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user=Depends(get_current_user),
):
    q = db.query(InventoryAsset).filter(InventoryAsset.school_id == current_user.school_id)
    if current_user.is_superuser or (hasattr(current_user, 'role') and current_user.role and current_user.role.name in ('ADMIN', 'SUPER_ADMIN')):
        q = q.execution_options(include_deleted=True)
    q = q.order_by(InventoryAsset.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[{"id": str(a.id), "name": a.name, "value": str(a.value), "status": a.status, "created_at": a.created_at.isoformat() if a.created_at else None} for a in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )
