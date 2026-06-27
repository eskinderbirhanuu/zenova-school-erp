from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SupportTicketCreate(BaseModel):
    subject: str = Field(max_length=500)
    description: Optional[str] = None
    priority: str = "Medium"
    school_id: Optional[str] = None
    school_name: Optional[str] = None


class SupportTicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[str] = None


class SupportTicketResponse(BaseModel):
    id: str
    ticket_number: str
    school_id: Optional[str] = None
    school_name: Optional[str] = None
    subject: str
    description: Optional[str] = None
    priority: str
    status: str
    assigned_to: Optional[str] = None
    assigned_name: Optional[str] = None
    created_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
