from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.inventory import (
    InventoryCategoryCreate, InventoryCategoryUpdate, InventoryCategoryResponse,
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    StockMovementCreate, StockMovementResponse,
    SupplierCreate, SupplierUpdate, SupplierResponse,
)
from app.services import inventory_service

from app.models.inventory_asset import InventoryAsset

router = APIRouter()
INVENTORY = [require_role("INVENTORY")]
VIEW_INVENTORY = [require_role("INVENTORY"), require_role("FINANCE"), require_role("ADMIN")]


@router.post("/inventory/categories", response_model=InventoryCategoryResponse, dependencies=INVENTORY)
def create_category(data: InventoryCategoryCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_category(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/categories", response_model=list[InventoryCategoryResponse], dependencies=VIEW_INVENTORY)
def list_categories(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.get_categories(db, current_user.school_id)


@router.patch("/inventory/categories/{category_id}", response_model=InventoryCategoryResponse, dependencies=INVENTORY)
def update_category(category_id: str, data: InventoryCategoryUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_category(db, category_id, data, current_user.id)


@router.delete("/inventory/categories/{category_id}", dependencies=INVENTORY)
def delete_category(category_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    inventory_service.delete_category(db, category_id, current_user.id)
    return {"message": "Category deleted"}


@router.post("/inventory/items", response_model=InventoryItemResponse, dependencies=INVENTORY)
def create_item(data: InventoryItemCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_item(db, current_user.school_id, data, current_user.id)


@router.patch("/inventory/items/{item_id}", response_model=InventoryItemResponse, dependencies=INVENTORY)
def update_item(item_id: str, data: InventoryItemUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_item(db, item_id, data, current_user.id)


@router.get("/inventory/items", response_model=list[InventoryItemResponse], dependencies=VIEW_INVENTORY)
def list_items(
    category_id: str = Query(None), low_stock: bool = Query(False),
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    return inventory_service.get_items(db, current_user.school_id, category_id, low_stock)


@router.post("/inventory/stock-movements", response_model=StockMovementResponse, dependencies=INVENTORY)
def record_movement(data: StockMovementCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.record_movement(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/stock-movements", response_model=list[StockMovementResponse], dependencies=VIEW_INVENTORY)
def list_movements(item_id: str = Query(None), db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.get_movements(db, current_user.school_id, item_id)


@router.post("/inventory/suppliers", response_model=SupplierResponse, dependencies=INVENTORY)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.create_supplier(db, current_user.school_id, data, current_user.id)


@router.get("/inventory/suppliers", response_model=list[SupplierResponse], dependencies=VIEW_INVENTORY)
def list_suppliers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.get_suppliers(db, current_user.school_id)


@router.patch("/inventory/suppliers/{supplier_id}", response_model=SupplierResponse, dependencies=INVENTORY)
def update_supplier(supplier_id: str, data: SupplierUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return inventory_service.update_supplier(db, supplier_id, data, current_user.id)


@router.delete("/inventory/suppliers/{supplier_id}", dependencies=INVENTORY)
def delete_supplier(supplier_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    inventory_service.delete_supplier(db, supplier_id, current_user.id)
    return {"message": "Supplier deleted"}


@router.get("/inventory/assets", dependencies=VIEW_INVENTORY)
def list_assets(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
                db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    assets = db.query(InventoryAsset).filter(InventoryAsset.school_id == current_user.school_id)
    return assets.order_by(InventoryAsset.created_at.desc()).offset(skip).limit(limit).all()
