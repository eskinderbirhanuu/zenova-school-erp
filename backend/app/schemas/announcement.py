from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    target_roles: str | None = None


class AnnouncementUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    target_roles: str | None = None
    is_published: bool | None = None


class AnnouncementResponse(BaseModel):
    id: str
    title: str
    content: str
    target_roles: str | None
    is_published: bool
    created_by: str
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
