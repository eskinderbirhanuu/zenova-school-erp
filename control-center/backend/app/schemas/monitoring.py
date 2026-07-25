from datetime import datetime
from pydantic import BaseModel

class HeartbeatRequest(BaseModel):
    customer_id: int
    version: str
    uptime: float
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    db_status: str = "ok"
    redis_status: str = "ok"

class HeartbeatResponse(BaseModel):
    status: str
    update_available: bool = False
    latest_version: str = ""
