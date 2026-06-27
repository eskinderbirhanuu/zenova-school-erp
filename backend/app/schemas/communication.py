from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AnnouncementCreate(BaseModel):
    title: str = Field(max_length=500)
    message: str
    target_roles: Optional[str] = None
    priority: str = "normal"


class AnnouncementResponse(BaseModel):
    id: str; title: str; message: str; target_roles: Optional[str] = None
    priority: str; school_id: str; created_by: str; created_at: Optional[datetime] = None


class NotificationResponse(BaseModel):
    id: str; user_id: str; title: str; message: Optional[str] = None
    notification_type: Optional[str] = None; reference_type: Optional[str] = None
    reference_id: Optional[str] = None; is_read: bool
    read_at: Optional[datetime] = None; created_at: Optional[datetime] = None


class MessageCreate(BaseModel):
    recipient_id: str
    subject: str = Field(max_length=500)
    message: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    recipient_id: str
    subject: str
    message: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    sender_name: Optional[str] = None
    created_at: Optional[datetime] = None
