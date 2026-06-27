from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_type: str = "general"
    event_date: datetime
    end_date: Optional[datetime] = None
    location: Optional[str] = None


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    event_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None


class EventResponse(BaseModel):
    id: str; title: str; description: Optional[str] = None
    event_type: str; event_date: Optional[datetime] = None; end_date: Optional[datetime] = None
    location: Optional[str] = None; school_id: str; created_by: Optional[str] = None
    created_at: Optional[datetime] = None
