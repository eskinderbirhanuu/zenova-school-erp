from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class JobPostingResponse(BaseModel):
    id: str
    position: str
    department: Optional[str] = None
    applicants_count: int = 0
    status: str
    posted_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
