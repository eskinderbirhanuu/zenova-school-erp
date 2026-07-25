from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.customer import Customer
from app.models.license import License
from app.models.heartbeat import Heartbeat
from app.schemas.monitoring import HeartbeatRequest, HeartbeatResponse

router = APIRouter()

@router.post("/heartbeat", response_model=HeartbeatResponse)
def record_heartbeat(data: HeartbeatRequest, db: Session = Depends(get_db)):
    hb = Heartbeat(**data.model_dump())
    db.add(hb)
    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if customer and data.version != customer.version:
        customer.version = data.version
    db.commit()
    return HeartbeatResponse(status="ok")

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    total_customers = db.query(Customer).count()
    active_licenses = db.query(License).filter(License.is_active == True).count()
    online_now = db.query(Heartbeat).filter(
        Heartbeat.recorded_at >= datetime.now() - timedelta(minutes=5)
    ).distinct(Heartbeat.customer_id).count()
    return {
        "total_customers": total_customers,
        "active_licenses": active_licenses,
        "online_now": online_now,
    }

@router.get("/heartbeats/{customer_id}")
def customer_heartbeats(customer_id: int, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Heartbeat).filter(
        Heartbeat.customer_id == customer_id
    ).order_by(Heartbeat.recorded_at.desc()).limit(limit).all()
