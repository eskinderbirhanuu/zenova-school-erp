from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_auth_context
from app.core.auth_deps import AuthContext
from app.core.permissions import Permission
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

_INVENTORY = [Permission.INVENTORY_MANAGE]
_VIEW_INVENTORY = [Permission.INVENTORY_MANAGE, Permission.FINANCE_ENTRY, Permission.FINANCE_REPORTS]


def _include_deleted(ctx: AuthContext) -> bool:
    return ctx.is_superuser or ctx.role in ("ADMIN", "SUPER_ADMIN")


@router.post("/inventory/categories", response_model=InventoryCategoryResponse)
def create_category(data: InventoryCategoryCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.create_category(db, ctx.school_id, data, ctx.id)


@router.get("/inventory/categories", response_model=list[InventoryCategoryResponse])
def list_categories(db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_VIEW_INVENTORY)
    include_deleted = _include_deleted(ctx)
    return inventory_service.get_categories(db, ctx.school_id, include_deleted=include_deleted)


@router.patch("/inventory/categories/{category_id}", response_model=InventoryCategoryResponse)
def update_category(category_id: str, data: InventoryCategoryUpdate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.update_category(db, category_id, data, ctx.id, ctx.school_id, include_deleted=True)


@router.delete("/inventory/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    inventory_service.delete_category(db, category_id, ctx.id, ctx.school_id, include_deleted=True)
    return {"message": "Category deleted"}


@router.post("/inventory/items", response_model=InventoryItemResponse)
def create_item(data: InventoryItemCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.create_item(db, ctx.school_id, data, ctx.id)


@router.patch("/inventory/items/{item_id}", response_model=InventoryItemResponse)
def update_item(item_id: str, data: InventoryItemUpdate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.update_item(db, item_id, data, ctx.id, ctx.school_id)


@router.get("/inventory/items")
def list_items(
    category_id: str = Query(None), low_stock: bool = Query(False),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)
):
    ctx.require_permission(*_VIEW_INVENTORY)
    q = db.query(InventoryItem).filter(InventoryItem.school_id == ctx.school_id)
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


@router.post("/inventory/stock-movements", response_model=StockMovementResponse)
def record_movement(data: StockMovementCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.record_movement(db, ctx.school_id, data, ctx.id)


@router.get("/inventory/stock-movements")
def list_movements(
    item_id: str = Query(None),
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context),
):
    ctx.require_permission(*_VIEW_INVENTORY)
    from app.models.inventory import StockMovement
    q = db.query(StockMovement).filter(StockMovement.school_id == ctx.school_id)
    if item_id:
        q = q.filter(StockMovement.item_id == item_id)
    q = q.order_by(StockMovement.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[StockMovementResponse.model_validate(m) for m in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )


@router.post("/inventory/suppliers", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.create_supplier(db, ctx.school_id, data, ctx.id)


@router.get("/inventory/suppliers", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_VIEW_INVENTORY)
    return inventory_service.get_suppliers(db, ctx.school_id)


@router.patch("/inventory/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: str, data: SupplierUpdate, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    return inventory_service.update_supplier(db, supplier_id, data, ctx.id, ctx.school_id)


@router.delete("/inventory/suppliers/{supplier_id}")
def delete_supplier(supplier_id: str, db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context)):
    ctx.require_permission(*_INVENTORY)
    inventory_service.delete_supplier(db, supplier_id, ctx.id, ctx.school_id)
    return {"message": "Supplier deleted"}


@router.get("/inventory/assets")
def list_assets(
    page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), ctx: AuthContext = Depends(get_auth_context),
):
    ctx.require_permission(*_VIEW_INVENTORY)
    q = db.query(InventoryAsset).filter(InventoryAsset.school_id == ctx.school_id)
    if _include_deleted(ctx):
        q = q.execution_options(include_deleted=True)
    q = q.order_by(InventoryAsset.created_at.desc())
    paginated_q, total, cur_page, cur_size, total_pages = paginate(q, page, page_size)
    items = paginated_q.all()
    return build_paginated_response(
        items=[{"id": str(a.id), "name": a.name, "value": str(a.value), "status": a.status, "created_at": a.created_at.isoformat() if a.created_at else None} for a in items],
        total=total, page=cur_page, page_size=cur_size, total_pages=total_pages,
    )
