from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.core.permissions import require_role
from app.schemas.cafeteria import ProductCreate, ProductUpdate, ProductResponse, OrderCreate, OrderResponse, OrderStatusUpdate
from app.services import cafeteria_service

router = APIRouter()
CAFETERIA = [require_role("CAFETERIA")]
VIEW_CAFE = [require_role("CAFETERIA"), require_role("ADMIN")]


@router.post("/cafeteria/products", response_model=ProductResponse, dependencies=CAFETERIA)
def create_product(data: ProductCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.create_product(db, current_user.school_id, data, current_user.id)


@router.get("/cafeteria/products", response_model=list[ProductResponse], dependencies=VIEW_CAFE)
def list_products(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.get_products(db, current_user.school_id)


@router.post("/cafeteria/orders", response_model=OrderResponse, dependencies=CAFETERIA)
def create_order(data: OrderCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.create_order(db, current_user.school_id, data, current_user.id)


@router.get("/cafeteria/orders", response_model=list[OrderResponse], dependencies=VIEW_CAFE)
def list_orders(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.get_orders(db, current_user.school_id)


@router.put("/cafeteria/products/{product_id}", response_model=ProductResponse, dependencies=CAFETERIA)
def update_product(product_id: str, data: ProductUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.update_product(db, product_id, current_user.school_id, data, current_user.id)


@router.delete("/cafeteria/products/{product_id}", dependencies=CAFETERIA)
def delete_product(product_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.delete_product(db, product_id, current_user.school_id, current_user.id)


@router.put("/cafeteria/orders/{order_id}/status", response_model=OrderResponse, dependencies=CAFETERIA)
def update_order_status(order_id: str, data: OrderStatusUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return cafeteria_service.update_order_status(db, order_id, current_user.school_id, data.status, current_user.id)
